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
			//console.log("middlware/authentication::applicationKey " + req.hostname);
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
				_.extend(req, configuration);
				req.addRole(configuration.token.role || "api-user");
				return true;
			}

			let token = await Token.findOne(
				{
					where: {
						key: req.headers['application-key'],
						secret: req.headers['application-secret']
					},
					join: "*"
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

			let obj = {
				token : null
			}

			let relations = Object.keys(Token.relations);

			relations.forEach(
				function(key) {
					if (token[key]) {
						//console.log("surfacing relation " + key);
						obj[key] = token[key];
						delete token[key];
					}
				}
			);

			obj.token = token;

			_.extend(req, obj);

			req.addRole(token.role || "api-user");

			await cache.set("configuration_" + key, obj);

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
				let isShouldCache = false;

				if (!session) {
					session = await Session.findOne(
						{
							where: {
								userId: decoded.id,
								token: token,
								expiresAt: {">": now()}
							},
							join: '*'
						}
					);
					if (session && session.error) {
						return session;
					}
					if (session && session.foreignKeys.userId) {
						session.user = session.foreignKeys.userId;
						delete session.foreignKeys;
					}
					isShouldCache = true;
				}

				if (!session || session.error) {
					return "Invalid Session";
				}

				req.addRole(session.user.role);

				let args = {
					user: session.user,
					token : token
				};

				_.extend(req, args);

				if (isShouldCache) {
					await cache.set(cacheKey, args);
				}
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
				let keyResult = await Authentication.applicationKey(req);
				if (keyResult !== true) {
					console.log("keyResult => " + keyResult);
				}
			}

			if (req.header['authorization']) {
				let authResult = await Authentication.bearerToken(req);
				if (authResult !== true) {
					console.log("authResult => " + authResult);
				}
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
			res.error("Unknown Server Error", 500);
		}
	}
} else {
	module.exports = require(path.resolve(__dirname + "/../../middleware/authentication"))
}

