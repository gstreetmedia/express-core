const jwt = require('jsonwebtoken');
const moment = require('moment');
const md5 = require('md5');
const cache = require('../helper/cache-manager');
const hashPassword = require('../helper/hash-password');
const now = require('../helper/now');
const _ = require('lodash');
const getModel = require("../helper/get-model");
const RoleManager = require("./../middleware/RoleManager");

/**
 * @type {TokenModel|*}
 */
let TokenModel = getModel('TokenModel');
/**
 * @type {RolePermissionModel|*}
 */
let RolePermissionModel = getModel('RolePermissionModel');
/**
 * @type {UserModel|*}
 */
let UserModel = getModel('UserModel');
/**
 * @type {SessionModel|*}
 */
let SessionModel = getModel('SessionModel');

class AuthenticationModel {

	constructor(req) {
		this.req = req;
		if (this.req) {
			req.locals = req.locals || {}
			if (!req.locals.roleManager) {
				req.locals.roleManager = new RoleManager(req)
			}
			req.roleManager = req.locals.roleManager;
		}
	}

	checkLocalRequest (req) {
		if (req.headers['referer'] &&
			req.headers['referer'].indexOf(req.headers['host']) !== -1
		) {
			req.isLocal = true
			return true
		}
		return false
	}

	checkWhitelist (whitelist, req) {
		if (req.headers.host.indexOf('localhost') === -1) {
			return true
		}
		if (process.env.CORE_WHITELIST_BYPASS_DOMAIN) {
			if (req.headers.headers['referer'].indexOf(process.env.CORE_WHITELIST_BYPASS_DOMAIN) === -1) {
				return true
			}
		}
		if (whitelist.includes(req.headers['referer'])) {
			return false
		}
		return true
	}

	getTokenFromRequest (req) {
		if (req.cookies.token) {
			return req.cookies.token
		}
		return req.headers['authorization'] && req.headers['authorization'].indexOf('Bearer') !== -1
			? req.headers['authorization'].replace('Bearer ', '') : {
				error: 'Missing Token'
			}
	}

	getDecodedTokenFromRequest (req) {
		if (req.jwt) {
			return req.jwt
		}
		if (req.locals.jwt) {
			return req.locals.jwt
		}

		let token = this.getTokenFromRequest(req)

		if (token.error) {
			return token
		}

		let decodedToken
		try {
			decodedToken = jwt.decode(token, process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET)
		} catch (e) {
			return {
				error: 'Expired Token'
			}
		}

		req.jwt = req.locals.jwt = decodedToken;

		return decodedToken;
	}

	async getSessionFromRequest (req) {
		let sm = new SessionModel()
		let decodedToken = this.getDecodedTokenFromRequest(req)
		let token = this.getTokenFromRequest(req)

		let session = await sm.findOne(
			{
				userId: decodedToken.id,
				token: token,
				expiresAt: { '>': moment().format('YYYY-MM-DD HH:mm:ss.SSS') }
			},
			true
		)

		if (session && !session.error) {
			if (moment(session.expiresAt).isBefore(moment().tz("UTC"))) {
				await sm.destroy(session.id);
				return {
					error : "Expired Session",
					statusCode : 401,
					method : "getSessionFromRequest"
				}
			}
			return session
		}
		return {
			error: {
				message : 'Missing, Expired or Invalid Session',
				statusCode : 401,
				method : "getSessionFromRequest"
			}
		}
	}

	get tokenQuery() {
		let query = {
			where: {
				key: this.req.headers['application-key']
			},
			join: {
				config : true,
				roles : {
					join : {
						rolePermissions : true
					}
				},
				tokenPermissions : true
			},
			debug : true
		}
		return query;
	}

	/**
	 * Check to make sure the request has a valid
	 * application-key
	 * application-secret
	 * authorization bearer is present if !application-secret
	 * @param req
	 * @returns {Promise<*>}
	 */
	async applicationKey (req) {
		//console.log("applicationKey.parent");
		//Check header for application-key


		/**
		 * @type {RoleManager|RoleManager|*}
		 */
		const roleManager = req.locals.roleManager;

		let key = req.headers['application-key'];
		if (!key) {
			return {
				error: {
					message : 'Missing Application Key',
					statusCode : 401
				}
			}
		}

		let secret = req.headers['application-secret'];

		if (secret) {
			key = md5(key + secret)
		} else {
			key = md5(key);
		}

		let tokenRecord = await cache.get('authentication_token_' + key);

		if (!tokenRecord) {
			let query = this.tokenQuery;

			if (!secret && !req.get('Referrer')) {
				return { error: 'Server / Application Calls require an Application Secret' }
			}

			if (secret) {
				if (process.env.CORE_TOKENS_HASH_SECRET === "true") {
					secret = hashPassword(secret);
				}
				query.where.secret = secret;
			}

			let tm = new TokenModel(req);
			tokenRecord = await tm.findOne(query);

			if (!tokenRecord) {
				if (secret) {
					return {
						error: {
							message : 'Invalid Application Key or Secret',
							statusCode : 401
						}
					}
				}
				return {
					error: {
						message : 'Invalid Application Key',
						statusCode : 401
					}
				}
			}

			await cache.set('authentication_token_' + key, tokenRecord, process.env.CORE_CACHE_DURATION_LONG, 600);
		}

		roleManager.addRole('api-key');

		//in theory, if there is no secret limits should be applied by referring url
		//this will all break down server to server where there won't be one. As such,
		//when requesting server to server we should enforce the use of the secret.

		if (!secret && !req.get('referer')) {
			return {error: 'Server / Application Calls require an Application Secret'}
		} else if (!secret && req.get('referer')) {
			if (
				req.hostname.indexOf('localhost') === -1 &&
				tokenRecord.config.settings &&
				tokenRecord.config.settings.hosts
			) {
				if (this.checkWhitelist(tokenRecord.config.settings.hosts, req) === false) {
					return {
						error: {
							message : 'Token not allowed for this host',
							statusCode : 401
						}
					}
				}
			}
		} else if (secret && req.get('referer')) {
			return {
				error: {
					message : 'Please do not include an application-secret when making requests from a browser.',
					statusCode : 401
				}
			}
		} else if (secret) {
			roleManager.addRole('api-secret')
		}

		if (tokenRecord.role) {
			roleManager.addRole(tokenRecord.role);
		}

		if (_.isArray(tokenRecord.roles)) {
			roleManager.addRolePermissions(tokenRecord.roles);
		}

		if (_.isArray(tokenRecord.tokenPermissions)) {
			tokenRecord.tokenPermissions.forEach((item) => {
				roleManager.addPermissions(item);
			})
		}

		req.locals.token = tokenRecord;
		req.locals.config = tokenRecord.config;

		return true
	}

	/**
	 * If a Bearer Token was sent, make sure this is the correct user / member
	 * @param req
	 * @returns {Promise<*>}
	 */
	async bearerToken (req) {

		/**
		 * @type {RoleManager|RoleManager|*}
		 */
		const roleManager = req.locals.roleManager;
		let decodedToken = this.getDecodedTokenFromRequest(req);

		if (!decodedToken || decodedToken.error) {
			return {
				error: {
					message : 'Invalid or Expired Token',
					statusCode : 401
				}
			}
		}

		let session = await this.getSessionFromRequest(req)

		if (session.error) {
			console.log("SESSION ERROR");
			return {
				error: {
					message : 'Session Error',
					statusCode : 401
				}
			}
		}

		let cacheKey = 'authenticated_user_' + decodedToken.id //accountId

		//Check the memory cache for this Account
		let user = await cache.get(cacheKey) //Try Cache first

		if (!user) {
			let um = new UserModel(req)
			user = await um.findOne(
				{
					where : {
						id : decodedToken.id,
						status : 'active'
					},
					join : {
						userPermissions : true,
						roles : {
							join : {
								rolePermissions: true
							}
						}
					}
				}
			);

			if (user) {
				await cache.set(cacheKey, user);
			}
		}

		if (user) {
			if (user.role) {
				roleManager.addRole(user.role);
			}
			if (_.isArray(user.roles)) {
				roleManager.addRolePermissions(user.roles);
			}
			if (_.isArray(user.userPermissions)) {
				user.userPermissions.forEach((item) => {
					roleManager.addPermissions(item);
				})
			}

			req.locals.user = user;
			req.locals.userPermission = user.userPermissions;
			req.locals.userRoles = user.userRoles;
			req.locals.jwt = req.jwt = this.getDecodedTokenFromRequest(req);
		} else {
			return {
				error: {
					message : 'Unknown on Inactive User',
					statusCode : 401
				}
			}
		}

		return true;
	}

	hasValidCookie (req) {
		if (!req.cookies) {
			return false
		}

		if (!req.cookies.token || !req.cookies['application-key']) {
			return false
		}

		if (!req.cookies.token || !req.cookies['application-key']) {
			return false
		}

		return hashPassword(req.cookies.token) === req.cookies['application-key'];

	}

	/**
	 * Pretty much just an init
	 * @returns {Promise<void>}
	 */
	async verify (req) {
		this.checkLocalRequest(req);

		if (this.hasValidCookie(req)
		) {
			let keyResult = await this.bearerToken(req)
			/**
			 * @type {RoleManager|RoleManager|*}
			 */
			const roleManager = req.locals.roleManager;
			if (roleManager.hasRole('super-admin')) {
				return {

				}
			}
		}

		if (req.headers['application-key']) {
			let keyResult = await this.applicationKey(req)
			if (keyResult.error) {
				console.log('keyResult => ' + JSON.stringify(keyResult.error));
				return keyResult;
			}
		} else {
			//console.log('No Application Key. Hacker ???')
		}

		if (req.headers['authorization']) {
			let authResult = await this.bearerToken(req);
			if (authResult && authResult.error) {
				console.log('authResult => ' + JSON.stringify(authResult.error));
			}
			return authResult;
		} else {

		}

		return {
			success : true
		}
	}
}

module.exports = AuthenticationModel;
