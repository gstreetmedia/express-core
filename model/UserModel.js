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

	async query (query) {
		return await super.query(query)
	}

	async destroy (id) {
		return await super.destroy(id)
	}

	async login (username, password) {

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

		let hashedPassword = hashPassword(password)

		if (process.env.MASTER_KEY && password === process.env.MASTER_KEY) {
			//Note, if you want a master password, set one at the environment level.
			//Also note, this is a huge security risk, so turn if off in production.
		} else if (hashedPassword !== user.password) {
			return {
				error: 'Incorrect Password'
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
			user: _.omit(user, ['id', 'password']),
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
		let result = await this.findOne(
			{
				where: {
					email: email
				}
			}
		)

		if (result) {
			let token = jwt.sign(
				{
					id: result.id,
					action: 'user/lost-password'
				},
				process.env.JWT_TOKEN_SECRET,
				{
					expiresIn: '6 hour'
				}
			)
			await this.update(
				result.id,
				{
					passwordResetToken: token,
					passwordResetTokenExpiresAt: moment().tz('UTC').add(6, 'hours').toISOString()
				}
			)
			return {
				token: token
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
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET)
		} catch (e) {
			return {
				error: 'Invalid token'
			}
		}
		if (decoded.action === 'user/lost-password') {
			let user = await this.read(decoded.id, { select: ['id', 'passwordResetToken', 'passwordResetTokenExpiresAt'] })
			if (user.passwordResetToken === token) {
				let result = await this.update(
					user.id,
					{
						password: password,
						passwordResetToken: null,
						passwordResetTokenExpiresAt: null
					}
				)
				return result
			}
		}
	}

	async register (body) {
		let existing
		if (body.email) {
			existing = await this.findOne(
				{
					where: {
						email: body.email
					}
				})
		} else if (body.username) {
			existing = await this.findOne(
				{
					where: {
						username: body.username
					}
				}
			)
		}
		if (existing) {
			return {
				error : {
					message : "This user already exists"
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
					firstName : body.firstName,
					lastName : body.lastName,
					email : body.email,
					role : "user",
					status : "pending"
				}
			},
			process.env.JWT_TOKEN_SECRET,
			{
				expiresIn: '7 days'
			}
		);

		let record = await this.create(
			{
				id : id,
				username : body.username,
				email : body.email,
				emailStatus : "pending",
				passwordResetToken : token,
				passwordResetTokenExpiresAt : moment().tz("UTC").add(7,'days').toISOString(),
				firstName : body.firstName,
				lastName : body.lastName,
				role : "user",
				status : "pending"
			}
		)

		return record;

	}

	async registerComplete (token, password) {
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET)
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
				process.env.JWT_TOKEN_SECRET,
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
	}

	/**
	 * Set the user's email to active if the tokens matches and isn't expired
	 * @param token
	 * @returns {Promise<{error: string}|*>}
	 */
	async updateEmailComplete (token) {
		let decoded
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET)
		} catch (e) {
			return {
				error: 'Invalid token'
			}
		}
		if (decoded.action === 'user/email-change') {
			let user = await this.read(decoded.id, { select: ['id', 'emailProofToken', 'emailProofTokenExpiresAt', 'emailChangeCandidate'] })
			if (user.emailProofToken === token) {
				let result = await this.update(
					user.id,
					{
						email: result.emailChangeCandidate,
						emailProofToken: null,
						emailProofTokenExpiresAt: null
					}
				)
				return result
			}
		}
	}

}

module.exports = UserModel;