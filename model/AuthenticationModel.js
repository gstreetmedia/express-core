const jwt = require('jsonwebtoken')
const moment = require('moment')
const md5 = require('md5')
const cache = require('../helper/cache-manager')
const hashPassword = require('../helper/hash-password')
const now = require('../helper/now')
const _ = require('lodash')

let TokenModel = require('../../model/TokenModel')
let UserModel = require('../../model/UserModel')
let SessionModel = require('../../model/SessionModel')

class AuthenticationModel {

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
		//console.log(req.headers);
		if (req.headers.host.indexOf('localhost') === -1) {
			return true
		}
		if (req.headers.host.indexOf('membio.com') === -1) {
			return true
		}
		if (whitelist.indexOf(req.headers['referer']) === -1) {
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

		req.jwt = decodedToken;

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

		req.locals = req.locals || {}

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

		let obj = await cache.get('configuration_' + key);

		if (!obj) {
			let query = {
				where: {
					key: req.headers['application-key']
				},
				join: '*'
			}

			if (secret) {
				query.where.secret = req.headers['application-secret']
			}

			let tm = new TokenModel(req);

			let tokenRecord = await tm.findOne(query);

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
			} else {
				//This is at the very least a request using an API KEY
				req.addRole('api-key')
			}

			//in theory, if there is no secret limits should be applied by referring url
			//this will all break down server to server where there won't be one. As such,
			//when requesting server to server we should enforce the use of the secret.
			if (!secret && !req.get('Referrer')) {
				return { error: 'Server / Application Calls require an Application Secret' }
			} else if (!secret && req.get('Referrer')) {
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
			} else if (secret && req.get('Referrer')) {
				return {
					error: {
						message : 'Please do not include an Application Secret when making requests from a browser.',
						statusCode : 401
					}
				}
			} else if (secret) {
				req.addRole('api-secret')
			}

			obj = {
				token: null
			}

			//surface all relations to top level eg : {token:{},config:{},dataset:{}}
			let relations = Object.keys(tm.relations)

			relations.forEach(
				function (key) {
					if (tokenRecord[key]) {
						obj[key] = tokenRecord[key]
						//delete tokenRecord[key]
					}
				}
			);

			obj.token = tokenRecord;

			await cache.set('configuration_' + key, obj, process.env.CACHE_DURATION_LONG || process.env.CORE_CACHE_DURATION_LONG);

		} else {
			req.addRole('api-key')
			if (secret) {
				req.addRole('api-secret')
			}
		}

		req.locals = req.locals || {};
		_.extend(req.locals, obj)
		_.extend(req, obj);

		if (obj.token.role) {
			req.addRole(obj.token.role)
		}

		return true
	}

	/**
	 * If a Bearer Token was sent, make sure this is the correct user / member
	 * @param req
	 * @returns {Promise<*>}
	 */
	async bearerToken (req) {
		//console.log('bearerToken.parent')
		let token
		let decodedToken = this.getDecodedTokenFromRequest(req);

		if (decodedToken.error) {
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
						"userPermissions" : true,
						"rolePermissions" : true
					}
				}
			);
			if (user) {
				await cache.set(cacheKey, user);
			}
		}

		if (user) {
			req.addRole(user.role);
			req.user = user;
			req.jwt = this.getTokenFromRequest(req);
		} else {

			return {
				error: {
					message : 'Unknown on Inactive User',
					statusCode : 401
				}
			}
		}

		return true
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

		if (hashPassword(req.cookies.token) === req.cookies['application-key']) {
			return true
		}
		return false
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
			if (keyResult.error) {
				//console.log('keyResult => ' + keyResult.error)
			} else {
				//console.log('Has Valid Cookie!!!')
			}
			if (req.currentRoles.indexOf('super-admin') !== -1) {
				return {

				}
			}
		}

		if (req.headers['application-key']) {
			let keyResult = await this.applicationKey(req)
			if (keyResult.error) {
				console.log('keyResult => ' + keyResult.error);
				return keyResult;
			}
		} else {
			//console.log('No Application Key. Hacker ???')
		}

		if (req.headers['authorization']) {
			let authResult = await this.bearerToken(req)
			return authResult;
		}

		return {
			success : true
		}
	}
}

module.exports = AuthenticationModel;
