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

	getTokenFromRequest(req) {
		if (req.cookies.token) {
			return req.cookies.token;
		}
		return req.headers['authorization'] && req.headers['authorization'].indexOf("Bearer") !== -1
			? req.headers['authorization'].replace("Bearer ", "") : {
			error : "Missing Token"
			};
	}

	getDecodedTokenFromRequest(req) {
		if (req.jwt) {
			return req.jwt;
		}

		let token = this.getTokenFromRequest(req);

		if (token.error) {
			return token.error;
		}

		let decodedToken;
		try {
			decodedToken = jwt.decode(token, process.env.JWT_TOKEN_SECRET);
		} catch (e) {
			return {
				error : "Expired Token"
			}
		}

		req.jwt = decodedToken;

		return decodedToken;
	}

	async getSessionFromRequest(req) {
		let sm = new SessionModel();
		let decodedToken = this.getDecodedTokenFromRequest(req);
		let token = this.getTokenFromRequest(req);
		let session = await sm.findOne(
			{
				userId: decodedToken.id,
				token: token,
				expiresAt: {">": moment().format("YYYY-MM-DD HH:mm:ss.SSS")}
			},
			true
		);
		if (session && !session.error) {
			return session;
		}
		return {
			error : "Missing, Expired or Invalid Session"
		}
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
		console.log("applicationKey.parent");
		//Check header for application-key

		let key = req.headers['application-key'];
		if (!key) {
			return {error : 'Missing Application Key'};
		}

		let secret = req.headers['application-secret'];
		if (secret) {
			key = md5(key + secret);
		}

		let configuration = await cache.get("configuration_" + key);

		if (configuration) {
			_.extend(req, configuration);
			req.addRole(configuration.token.role || "api-user");
			return true;
		}

		let query = {
			where: {
				key: req.headers['application-key']
			},
			join: "*"
		};

		if (secret) {
			query.where.secret = req.headers['application-secret'];
		}

		let tm = new TokenModel(req);
		let tokenRecord = await tm.findOne(query, true);

		if (!tokenRecord) {
			if (secret) {
				return {error : 'Invalid Application Key or Secret'};
			}
			return {error : 'Invalid Application Key'};
		}

		if (
			req.hostname.indexOf("localhost") === -1 &&
			tokenRecord.config.settings &&
			tokenRecord.config.settings.hosts
		) {
			if (this.checkWhitelist(tokenRecord.config.settings.hosts, req.hostname) === false) {
				return 'Token not allowed for this host';
			}
		}

		let obj = {
			token: null
		};


		//surface all relations to top level eg : {token:{},config:{},dataset:{}}
		let relations = Object.keys(tm.relations);

		relations.forEach(
			function (key) {
				if (tokenRecord[key]) {
					obj[key] = tokenRecord[key];
					delete tokenRecord[key];
				}
			}
		);

		obj.token = tokenRecord;

		_.extend(req, obj);

		req.addRole(tokenRecord.role || "api-user");

		await cache.set("configuration_" + key, obj, process.env.CACHE_DURATION_LONG);

		return true;
	}


	/**
	 * If a Bearer Token was sent, make sure this is the correct user / member
	 * @param req
	 * @returns {Promise<*>}
	 */
	async bearerToken(req) {
		console.log("bearerToken.parent");
		let token;
		let decodedToken = this.getDecodedTokenFromRequest(req);
		if (decodedToken.error) {
			return decodedToken.error;
		}

		let session = await this.getSessionFromRequest(req);

		if (session.error) {
			return session.error; //Not a valid token
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
		this.checkLocalRequest(req);

		if (this.hasValidCookie(req)
		) {
			let keyResult = await this.bearerToken(req);
			if (keyResult !== true) {
				console.log("keyResult => " + keyResult);
			} else {
				console.log("Has Valid Cookie!!!");
			}
			if (req.currentRoles.indexOf("super-admin") !== -1) {
				return;
			}
		}

		if (req.headers['application-key']) {
			let keyResult = await this.applicationKey(req);
			if (keyResult !== true) {
				console.log("keyResult => " + keyResult);
			}
		} else {
			console.log("No Application Key. Hacker ???");
		}

		if (req.headers['authorization']) {
			let authResult = await this.bearerToken(req);
			if (authResult !== true) {
				console.log("authResult => " + authResult);
			}
		} else {
			console.log("No Auth");
		}
	}
}


