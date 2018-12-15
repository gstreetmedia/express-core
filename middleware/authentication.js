const fs = require("fs");
const path = require("path");


if (!fs.existsSync(path.resolve(__dirname + "/../../middleware/authentication.js"))) {

	const jwt = require('jsonwebtoken');
	const moment = require('moment');
	const md5 = require('md5');
	const cache = require('../helper/cache-manager');
	const hashPassword = require("../helper/hash-password");
	const now = require("../helper/now");
	const _ = require("lodash");

	let ConfigModel = require("../../model/ConfigModel");
	let TokenModel = require("../../model/TokenModel");
	let UserModel = require("../../model/UserModel");
	let SessionModel = require("../../model/SessionModel");

	const Token = new TokenModel();
	const Session = new SessionModel();
	const User = new UserModel();
	const Config = new ConfigModel();

	class Authentication {

		constructor(req) {

		}

		static checkLocalRequest(req) {
			if (req.headers['referer'] &&
				req.headers['referer'].indexOf(req.headers['host']) !== -1
			) {
				req.isLocal = true;
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
		 * @returns {Promise<*>}
		 */
		static async applicationKey(req) {
			console.log("middlware/authentication::applicationKey " + req.hostname);
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

			if (
				req.hostname.indexOf("localhost") === -1 &&
				token.config.settings &&
				token.config.settings.hosts
			) {
				if (_.indexOf(token.config.settings.hosts, req.hostname) === -1) {
					return 'Token not allowed for this host';
				}
			}

			req.config = token.config;
			req.token = token;
			delete token.config;
			req.addRole(token.role || "api-user");

			await cache.set("configuration_" + key,
				{
					token: req.token,
					config: req.config
				}
			);

			return true;
		}


		/**
		 * If a Bearer Token was sent, make sure this is the correct user / member
		 * @param req
		 * @returns {Promise<*>}
		 */
		static async bearerToken(req) {
			let token;

			if (req.cookies.token) {
				//console.log("is cookie token");
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
					await this.sessionModel.destroyWhere(
						{
							where: {
								tokenId: token
							}
						}
					);
					return "Expired Token"
				}

				if (!decoded) {
					return;
				}

				let cacheKey = "session" + decoded.id;

				//Check the memory cache for this Session. Go to the DB if not found
				let session = await cache.get(cacheKey); //Try Cache first

				if (!session) {
					session = await Session.findOne(
						{
							where: {
								userId: decoded.id,
								token: token,
								expiresAt: {">": now()}
							},
							join: ['user']
						}
					);
				} else {
					req.user = session.user;
					req.jwt = token;
					req.addRole(session.user.role);
					return true;
				}

				if (!session) {
					return "Invalid Session";
				}


				req.addRole(session.user.role);
				req.jwt = token;
				req.user = session.user;

				let args = {
					user: req.user
				};

				await cache.set(cacheKey, args);
			}

			return true;
		}

		static hasValidCookie(req) {
			if (!req.cookies) {
				return false;
			}
			if (!req.cookies.token || ! req.cookies['application-key']) {
				return false;
			}
			if (!req.cookies.token || ! req.cookies['application-key']) {
				return false;
			}
			if (hashPassword(req.cookies.token) === req.cookies['application-key']) {
				return true;
			}
			return false;
		}

		/**
		 * Pretty much just an init
		 * @returns {Promise<void>}
		 */
		static async verify(req) {

			let context = this;
			let localRequest = false;

			Authentication.checkLocalRequest(req);

			if (Authentication.hasValidCookie(req)
			) {
				await Authentication.bearerToken(req);
			}

			if (req.headers['application-key']) {
				await Authentication.applicationKey(req);
			}

			if (req.header['authorization']) {
				await Authentication.bearerToken(req);
			}

			return;
		}
	}

	module.exports = async function (req, res, next) {
		try {
			await Authentication.verify(req);
			next();
		} catch (e) {
			console.log(e);
			a.error("Unknown Server Error", 500);
		}
	}
} else {
	module.exports = require(path.resolve(__dirname + "/../../middleware/authentication"))
}

