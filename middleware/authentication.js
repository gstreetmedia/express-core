const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.resolve(__dirname + "/../../middleware/authentication.js"))) {


	const jwt = require('jsonwebtoken');
	const moment = require('moment');
	const md5 = require('md5');
	const cache = require('../helper/cache-manager');

	let ConfigModel = require("../../model/ConfigModel");
	let TokenModel = require("../../model/TokenModel");
	let UserModel = require("../../model/UserModel");
	let SessionModel = require("../../model/SessionModel");

	const Token = new TokenModel();
	const Session = new SessionModel();
	const User = new UserModel();
	const Config = new ConfigModel();


	class Authentication {

		constructor(req, res, next) {
			this.req = req;
			this.res = res;
			this.next = next;

		}

		isLocalRequest(req, res) {

			if (req.headers['referer'] && req.headers['referer'].indexOf(req.headers['host']) !== -1) {
				console.log("local request");
				return true;
			}
			return false;
		}

		/**
		 * Check to make sure the request has a valid
		 * application-key
		 * application-secret
		 * application-org
		 * authorization bearer is present if !application-secret
		 * @param req
		 * @param res
		 * @returns {Promise<*>}
		 */
		async applicationKey(req, res) {
			console.log("middlware/authentication::applicationKey");
			//Check header for application-key
			let key = req.headers['application-key'];
			if (!key) {
				return 'Missing Application Key';
			}

			let secret = req.headers['application-secret'];
			if (secret) {
				key = md5(key + secret);
			} else {
				return 'Missing Secret';
			}

			let configuration = await cache.get("configuration_" + key);

			if (configuration) {
				req.token = configuration.token;
				req.config = configuration.config;
				req.addRole("api-user");
				return true;
			}

			let token = await Token.findOne(
				{
					where: {
						key: req.headers['application-key'],
						secret: req.headers['application-secret']
					},
					join: ['config']
				}
			);

			if (!token) {
				return 'Invalid Application Key';
			}

			req.config = token.config;
			req.token = token;
			delete token.config;
			req.addRole("api-user");

			await cache.set("configuration_" + key,
				{
					token: req.token,
					config: req.config
				}
			)

			//console.log("good app key & secret");

			return true;

		}


		/**
		 * If a Bearer Token was sent, make sure this is the correct user / member
		 * @param req
		 * @param res
		 * @returns {Promise<*>}
		 */
		async bearerToken(req, res) {
			let token;

			if (req.cookies.token) {
				console.log("is cookie token");
				token = req.cookies.token;
			} else {
				token = req.headers['authorization'] && req.headers['authorization'].indexOf("Bearer") !== -1
					? req.headers['authorization'].replace("Bearer ", "") : null;
			}

			if (token) {
				let decoded;
				try {
					decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
				} catch (e) {
					await this.sessionModel.destroy(
						{
							where: {
								tokenId: token
							}
						}
					);
					return "Expired Token"
				}

				if (!decoded) {
					return next(); //Not a valid token
				}

				let cacheKey = "session" + decoded.id;

				//Check the memory cache for this Session. Go to the DB if not found
				let session = await cache.get(cacheKey); //Try Cache first

				//console.log(decoded);

				if (!session) {
					console.log("no cache");
					session = await this.sessionModel.findOne(
						{
							where: {
								userId: decoded.id,
								token: token,
								expiresAt: {">": moment().format("YYYY-MM-DD HH:mm:ss.SSS")}
							},
							select: ['id'],
							join: ['user']
						}
					);
				} else {
					req.user = session.user;
					return true;
				}

				if (!session) {
					return "Invalid Session";
				}

				req.addRole("session");

				req.jwt = token;
				req.user = session.user;

				let args = {
					user: req.user
				};
				//console.log("saving cache");
				await cache.set(cacheKey, args);
			}

			return true;
		}

		/**
		 * Shoot out an error
		 * @param message
		 * @param code
		 */
		error(message, code) {
			this.res.status(code || 500).send(
				{
					error: true,
					message: message
				}
			)
		}

		/**
		 * Pretty much just an init
		 * @returns {Promise<void>}
		 */
		async verify() {

			let context = this;
			let localRequest = false;

			this.req.isLocal = this.isLocalRequest(this.req, this.res);

			if (this.req.isLocal &&
				!this.req.headers['application-key'] &&
				(this.req.cookies && this.req.cookies.token)
			) {
				return this.next();
			}

			if (this.req.headers['application-key']) {
				await this.applicationKey(this.req, this.res);
			}

			if (this.req.header['authorization']) {
				await this.bearerToken(this.req, this.res);
			}


			this.next();
		}
	}


	module.exports = async function (req, res, next) {
		console.log("middlware/authentication");

		let a = new Authentication(req, res, next);
		try {
			await a.verify()
		} catch (e) {
			console.log(e);
			a.error("Unknown Server Error", 500);
		}
	}
} else {
	module.exports = require(path.resolve(__dirname + "/../../middleware.authentication"))
}

