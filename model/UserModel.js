const ModelBase = require('./ModelBase');
const _ = require('lodash');
const getModel = require("../helper/get-model");
const getHelper = require("../helper/get-helper");
const hashPassword = getHelper("hash-password");
const now = getHelper("now");
const jwt = require('jsonwebtoken');
const uuid = require("node-uuid");
const moment = require("moment");

class UserModel extends ModelBase {

	get tableName () {
		return '_users'
	}

	hashPassword(password) {
		return hashPassword(password);
	}
	/**
	 * Allows for local override of the session model
	 * @returns {SessionModel|ModelBase}
	 * @constructor
	 */
	get SessionModel() {
		return this.loadModel("SessionModel");
	}

	async create (data) {
		if (data.email) {
			data.email = data.email.toLowerCase();
		}
		if (data.password) {
			data.password = this.hashPassword(data.password)
		}
		if (!data.name && data.firstName && data.lastName) {
			data.name = data.firstName + ' ' + data.lastName
		}

		return super.create(data)
	}

	async update (id, data, fetch) {
		if (data.email) {
			data.email = data.email.toLowerCase();
		}
		if (data.password) {
			data.password = this.hashPassword(data.password)
		} else if (data.password === '') {
			delete data.password
		}
		return super.update(id, data, fetch)
	}

	async afterUpdate(id, data) {
		await this.cacheManager.destroy('authenticated_user_' + id);
	}

	async login (username, password, ignorePassword) {
		username = username.toLowerCase();
		let q = {
			where: {
				or: [
					{ email: username },
					{ username: username }
				],
				status: {"in" : ['active','pending']}
			},
			select: ['id', 'password', 'name', 'firstName', 'lastName', 'email', 'username', 'role', 'status']
		};
		let user = await this.findOne(q);

		if (!user) {
			return {
				error: {
					message : "Unknown User"
				}
			}
		}

		if (user.status === "pending") {
			//await this.destroy(user.id);
			return {
				error: {
					message : "Your account activation did not complete. Please register again.",
					statusCode : 401
				}
			}
		}

		if (!ignorePassword) {
			let hashedPassword = this.hashPassword(password);

			if (process.env.CORE_MASTER_KEY && password === process.env.CORE_MASTER_KEY) {
				//Note, if you want a master password, set one at the environment level.
				//Also note, this is a huge security risk, so turn if off in production.
			} else if (hashedPassword !== user.password) {
				return {
					error: 'Incorrect Password',
					statusCode : 401
				}
			}
		}

		let SessionModel = this.SessionModel;
		let sessionModel = new SessionModel(this.req);
		let token = await sessionModel.getToken(user.id, user)

		await this.update(user.id,
			{
				lastLoginAt: now()
			}
		)

		return {
			user: _.omit(user, ['password']),
			token: token
		}
	}

	async logout (token) {
		let SessionModel = this.SessionModel;
		let sessionModel = new SessionModel(this.req);
		let session = await sessionModel.findOne(
			{
				where : {
					token : token
				}
			}
		)
		if (session) {
			await this.cacheManager.destroy('authenticated_user_' + session.userId);
			return sessionModel.destroyWhere(
				{
					where: {
						token: token
					}
				}
			)
		}
		return {

		}
	}

	async logoutAll (id) {
		let SessionModel = this.SessionModel;
		let sessionModel = new SessionModel(this.req);
		await this.cacheManager.destroy('authenticated_user_' + id);
		return sessionModel.destroyWhere(
			{
				where: {
					userId: id
				}
			}
		)
	}

	/**
	 * Reset a user's password by email
	 * @param email
	 * @returns {Promise<{token: *}>}
	 */
	async lostPasswordStart (email) {
		email = email.toLowerCase();
		let record = await this.findOne(
			{
				where: {
					email: email,
					status: {"in" : ['active','pending']}
				}
			}
		)

		if (record) {
			let token = jwt.sign(
				{
					id: record.id,
					action: 'user/lost-password'
				},
				process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET,
				{
					expiresIn: '6 hour'
				}
			)
			record = await this.update(
				record.id,
				{
					passwordResetToken: token,
					passwordResetTokenExpiresAt: moment().tz('UTC').add(6, 'hours').toISOString()
				},
				true
			)
			return _.omit(record, ['password']);
		}

		return {
			error: {
				message : "If this email address exists in our system, we'll email you further instructions.",
				statusCode : 404
			}
		}
	}

	/**
	 * Update a user's password if the token is still valid
	 * @param email
	 * @returns {Promise<{token: *}>}
	 */
	async lostPasswordComplete (token, password) {
		let decoded
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET)
		} catch (e) {
			return {
				error: {
					message : 'Invalid token'
				}
			}
		}
		if (decoded.action === 'user/lost-password') {
			let user = await this.read(decoded.id)
			if (user.passwordResetToken === token) {
				let result = await this.update(
					user.id,
					{
						password: password,
						passwordResetToken: null,
						passwordResetTokenExpiresAt: null,
						status : "active"
					}
				);
				let sm = new this.SessionModel();
				await sm.destroyWhere(
					{
						userId : decoded.id
					}
				);
				return await this.login(user.email, null, true);
			} else {
				return {
					error: {
						message : 'Invalid token'
					}
				}
			}
		}
		return {
			error: {
				message : 'Invalid token'
			}
		}
	}

	async register (data) {
		let existing;
		data.email = data.email.toLowerCase();
		if (data.email) {
			existing = await this.findOne(
				{
					where: {
						email: data.email
					}
				})
		} else if (data.username) {
			existing = await this.findOne(
				{
					where: {
						username: data.username
					}
				}
			)
		}

		if (existing && existing.status === "active") {
			return {
				error : {
					message : "A user with this email already exists in our system. Please login or try a different email.",
					statusCode : 409
				}
			}
		} else if (existing && existing.status === "pending") {
			let token = jwt.sign(
				{
					id: existing.id,
					action: 'user/register',
					data : {
						id : existing.id,
						firstName : existing.firstName,
						lastName : existing.lastName,
						email : existing.email,
						role : "user",
						status : "pending"
					}
				},
				process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET,
				{
					expiresIn: '7 days'
				}
			);
			let record = await this.update(
				existing.id,
				{
					emailStatus : "pending",
					passwordResetToken : token,
					passwordResetTokenExpiresAt : moment().tz("UTC").add(7,'days').toISOString(),
				},
				true
			)
			return record;
		}

		let id = uuid.v4();

		let token = jwt.sign(
			{
				id: id,
				action: 'user/register',
				data : {
					id : id,
					firstName : data.firstName,
					lastName : data.lastName,
					email : data.email,
					role : "user",
					status : "pending"
				}
			},
			process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET,
			{
				expiresIn: '7 days'
			}
		);

		let record = await this.create(
			{
				id : id,
				username : data.username,
				email : data.email,
				emailStatus : "pending",
				passwordResetToken : token,
				passwordResetTokenExpiresAt : moment().tz("UTC").add(7,'days').toISOString(),
				firstName : data.firstName,
				lastName : data.lastName,
				role : "user",
				status : "pending"
			}
		)

		return record;

	}

	async registerComplete (token, password) {
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET)
		} catch (e) {
			return {
				error : {
					message : "Expired or Invalid Registration Link",
					statusCode : 401
				}
			}
		}

		if (decoded.action === 'user/register') {
			let user = await this.read(decoded.id);
			if (user.passwordResetToken === token) {
				let result = await this.update(
					user.id,
					{
						password: password,
						passwordResetToken: null,
						passwordResetTokenExpiresAt: null,
						status: "active",
						emailStatus: "active"
					},
					true
				)
				return result;
			} else {
				return {
					error : {
						message : "Your activation link has expired, please create a new account.",
						statusCode : 401
					}
				}
			}
		}

		return {
			error : {
				message : "Unknown Error",
				statusCode : 401
			}
		};
	}

	/**
	 * Update the user's email.
	 * @param id
	 * @param email
	 * @returns {Promise<void>}
	 */
	async updateEmailStart (id, email) {

		console.log("UserModel:updateEmailStart");

		let result = await this.read(id);
		email = email.toLowerCase();

		if (result) {

			if (result.email === email) {
				return {
					error : {
						message : "This is currently your email. Nothing to change!",
						statusCode : 403
					}
				}
			}

			let emailResults = await this.find(
				{
					where : {
						email : email
					},
					select : ['id','email']
				}
			);

			console.log(emailResults);

			if (emailResults.length > 0) {
				return {
					error : {
						message : "Sorry. This email is already in use by another user.",
						statusCode : 403
					}
				}
			}

			let token = jwt.sign(
				{
					id: result.id,
					action: 'user/email-change'
				},
				process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET,
				{
					expiresIn: '6 hour'
				}
			)
			await this.update(
				result.id,
				{
					emailChangeCandidate: email,
					emailProofToken: token,
					emailProofTokenExpiresAt: moment().tz('UTC').add(6, 'hours').toISOString()
				}
			)

			return {
				token: token
			}
		}

		return {
			error : "Unknown user"
		}
	}

	/**
	 * Set the user's email to active if the tokens matches and isn't expired
	 * @param token
	 * @returns {Promise<{error: string}|*>}
	 */
	async updateEmailComplete (token) {
		let decoded
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET)
		} catch (e) {
			return {
				error: {
					message : 'Invalid token',
					statusCode : 401
				}
			}
		}
		if (decoded.action === 'user/email-change') {
			let user = await this.read(decoded.id, { select: ['id', 'emailProofToken', 'emailProofTokenExpiresAt', 'emailChangeCandidate'] })
			if (user.emailProofToken === token) {
				let result = await this.update(
					user.id,
					{
						email: user.emailChangeCandidate,
						emailProofToken: null,
						emailProofTokenExpiresAt: null,
						emailChangeCandidate: null
					},
					true
				)

				let sm = new this.SessionModel();
				await sm.destroyWhere(
					{
						userId : decoded.id
					}
				);
				return await this.login(result.email, null, true);
			} else {
				return {
					error: {
						message : 'Expired or Invalid Token',
						statusCode : 401
					}
				}
			}
		}
		return {
			error: {
				message : 'Invalid token',
				statusCode : 401
			}
		}
	}

	async destroy(id) {
		try {
			const UP = getModel("UserPermissionModel");
			let m = new UP(this.req);
			await m.destroyWhere(
				{
					where: {
						userId: id
					}
				}
			);
		} catch (e) {

		}
		try {
			const UR = getModel("UserRoleModel");
			let m = new UR(this.req);
			await m.destroyWhere(
				{
					where : {
						userId : id
					}
				}
			);
		} catch (e) {

		}


		return super.destroy(id);
	}

}

module.exports = UserModel;
