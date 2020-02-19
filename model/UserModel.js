const ModelBase = require('./ModelBase');
const _ = require('lodash');
const hashPassword = require('../helper/hash-password');
const SessionModel = require('./SessionModel');
const now = require('../helper/now');
const jwt = require('jsonwebtoken');
const uuid = require("node-uuid");
const moment = require("moment");

class UserModel extends ModelBase {

	constructor (req) {
		super(req)
	}

	get tableName () {
		return UserModel.tableName
	}

	static get tableName () {
		return 'users'
	}

	static get schema () {
		return ModelBase.getSchema(UserModel.tableName)
	}

	static get fields () {
		return ModelBase.getFields(UserModel.tableName)
	}

	async create (data) {
		if (data.email) {
			data.email = data.email.toLowerCase();
		}
		if (data.password) {
			data.password = hashPassword(data.password)
		}
		if (!data.name && data.firstName && data.lastName) {
			data.name = data.firstName + ' ' + data.lastName
		}
		return await super.create(data)
	}

	async read (id, query, cache) {
		return await super.read(id, query, cache)
	}

	async update (id, data, fetch) {
		if (data.email) {
			data.email = data.email.toLowerCase();
		}
		if (data.password) {
			data.password = hashPassword(data.password)
		} else if (data.password === '') {
			delete data.password
		}
		return await super.update(id, data, fetch)
	}

	async query (query, cache) {
		return await super.query(query)
	}

	async destroy (id) {
		return await super.destroy(id)
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
			let hashedPassword = hashPassword(password)

			if (process.env.MASTER_KEY && password === process.env.MASTER_KEY) {
				//Note, if you want a master password, set one at the environment level.
				//Also note, this is a huge security risk, so turn if off in production.
			} else if (hashedPassword !== user.password) {
				return {
					error: 'Incorrect Password',
					statusCode : 401
				}
			}
		}

		let sm = new SessionModel(this.req)
		let token = await sm.getToken(user.id, user, this.req)

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
		let sm = new SessionModel(this.req)
		return await sm.destroyWhere(
			{
				where: {
					token: token
				}
			}
		)
	}

	async logoutAll (id) {
		let sm = new SessionModel(this.req)
		return await sm.destroyWhere(
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
					status: 'active'
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
						passwordResetTokenExpiresAt: null
					}
				)
				let sm = new SessionModel();
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
					message : "Expired or Invalid Token",
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
						status : "active",
						emailStatus: "active"
					},
					true
				)
				return result;
			} else {
				return {
					error : {
						message : "Token mismatch",
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

				let sm = new SessionModel();
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

}

module.exports = UserModel;