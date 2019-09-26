const jwt = require('jsonwebtoken');
const moment = require('moment');
const md5 = require('md5');
const cache = require('../helper/cache-manager');
const hashPassword = require("../helper/hash-password");
const now = require("../helper/now");
const _ = require("lodash");

let TokenModel = require("../../model/TokenModel");
let UserModel = require("../../model/UserModel");
let SessionModel = require("../../model/SessionModel");


module.exports = class AuthenticationModel {

	checkLocalRequest(req) {
		if (req.headers['referer'] &&
			req.headers['referer'].indexOf(req.headers['host']) !== -1
		) {
			req.isLocal = true;
			return true;
		}
		return false;
	}

	checkWhitelist(whitelist, req) {
		//console.log(req.headers);
		if (req.headers.host.indexOf("localhost") === -1) {
			return true;
		}
		if (req.headers.host.indexOf("membio.com") === -1) {
			return true;
		}
		if (whitelist.indexOf(req.headers['referer']) === -1) {
			return false;
		}
		return true;
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
	async applicationKey(req) {
		console.log("AuthenticationModel::applicationKey")
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

		let tm = new TokenModel(req);
		let token = await tm.findOne(
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
			if (this.checkWhitelist(token.config.settings.hosts, req.hostname) === false) {
				return 'Token not allowed for this host';
			}
		}

		let obj = {
			token: null
		};

		let relations = Object.keys(tm.relations);

		relations.forEach(
			function (key) {
				if (token[key]) {
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
	async bearerToken(req) {
		console.log("bearertoken adult");
		let token;
		let sm = new SessionModel(req);

		if (req.cookies.token) {
			token = req.cookies.token;
		} else {
			token = req.headers['authorization'] && req.headers['authorization'].indexOf("Bearer") !== -1
				? req.headers['authorization'].replace("Bearer ", "") : null;
		}

		if (token) {
			let decodedToken;
			try {
				decodedToken = jwt.decode(token, process.env.JWT_TOKEN_SECRET);
				console.log(decodedToken);
			} catch (e) {

				console.log("WTFFFFFFFFFFFFFFFFFFFFF");

				await sm.destroyWhere(
					{
						token: token
					});
				return "Expired Token";
			}

			if (!decodedToken) {
				if (req.session.token) {
					delete req.session.token;
				}
				return "Invalid token"; //Not a valid token
			}

			let session = await sm.findOne(
				{
					userId: decodedToken.id,
					token: token,
					expiresAt: {">": now()}
				},
				true
			);

			if (!session) {
				return "Expired Session"; //Not a valid token
			}

			let cacheKey = "authenticated_user_" + decodedToken.id; //accountId

			//Check the memory cache for this Account
			let user = await cache.get(cacheKey); //Try Cache first

			if (!user) {
				let um = new UserModel(req);
				user = await um.read(decodedToken.data.id);
				await cache.set(cacheKey, user);
			}

			if (user) {
				req.addRole(user.role);
			}

			req.user = user;
			req.jwt = token;

		}

		return true;
	}

	hasValidCookie(req) {
		if (!req.cookies) {
			return false;
		}
		if (!req.cookies.token || !req.cookies['application-key']) {
			return false;
		}
		if (!req.cookies.token || !req.cookies['application-key']) {
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
	async verify(req) {

		let context = this;
		let localRequest = false;

		this.checkLocalRequest(req);

		if (this.hasValidCookie(req)
		) {
			let keyResult = await this.bearerToken(req);
			if (keyResult !== true) {
				console.log("keyResult => " + keyResult);
			}
		}

		if (req.headers['application-key']) {
			let keyResult = await this.applicationKey(req);
			if (keyResult !== true) {
				console.log("keyResult => " + keyResult);
			}
		}

		if (req.header['authorization']) {
			let authResult = await this.bearerToken(req);
			if (authResult !== true) {
				console.log("authResult => " + authResult);
			}
		}

		return;
	}
}


