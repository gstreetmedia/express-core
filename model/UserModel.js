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

	async index (query) {
		return await super.index(query)
	}

	async create (data) {
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

		let user = await this.findOne(
			{
				where: {
					or: [
						{ email: username },
						{ username: username }
					],
					status: 'active'
				},
				select: ['id', 'password', 'name', 'firstName', 'lastName', 'email', 'username', 'role', 'status']
			}
		)

		if (!user) {
			return {
				error: 'Unknown Username'
			}
		}

		if (!ignorePassword) {
			let hashedPassword = hashPassword(password)

			if (process.env.MASTER_KEY && password === process.env.MASTER_KEY) {
				//Note, if you want a master password, set one at the environment level.
				//Also note, this is a huge security risk, so turn if off in production.
			} else if (hashedPassword !== user.password) {
				return {
					error: 'Incorrect Password'
				}
			}
		}

		let sm = new SessionModel(this.req)
		let token = await sm.getToken(user, this.req)

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
	}

	/**
	 * Update a user's password if the token is still valid
	 * @param email
	 * @returns {Promise<{token: *}>}
	 */
	async lostPasswordComplete (token, password) {

		console.log("WTF");

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
		let existing
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
		if (existing) {
			return {
				error : {
					message : "A user with this email already exists in our system. Please login or try a different email.",
					statusCode : 409
				}
			}
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
			console.log(user.passwordResetToken);
			console.log(token);
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
						message : "Token mistmatch",
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
		let result = await this.read(id)

		if (result) {
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