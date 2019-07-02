const ModelBase = require('./ModelBase');
const _ = require('lodash');
const hashPassword = require("../helper/hash-password");
const SessionModel = require("./SessionModel");
const now = require('../helper/now');
const jwt = require('jsonwebtoken')

module.exports = class UserModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return UserModel.tableName;
	}

	static get tableName() {
		return "users";
	}

	static get schema() {
		return ModelBase.getSchema(UserModel.tableName);
	}

	static get fields() {
		return ModelBase.getFields(UserModel.tableName);
	}

	async index(query) {
		return await super.index(query);
	}

	async create(data) {
		data.password = hashPassword(data.password);
		if (!data.name) {
			data.name = data.firstName + " " + data.lastName;
		}
		return await super.create(data);
	}

	async read(id, query) {
		return await super.read(id, query);
	}

	async update(id, data, query) {
		if (data.password) {
			data.password = hashPassword(data.password);
		} else if (data.password === '') {
			delete data.password;
		}
		return await super.update(id, data, query);
	}

	async query(query) {
		return await super.query(query);
	}

	async destroy(id) {
		return await super.destroy(id);
	}

	async login(username, password) {

		let user = await this.findOne(
			{
				where: {
					or: [
						{email: username},
						{username : username}
					],
					status : 'active'
				},
				select : ['id','password','name','firstName','lastName','email','username','role','status']
			}
		);

		if (!user) {
			return {
				error: "Unknown Username"
			}
		}

		let hashedPassword = hashPassword(password);

		if (process.env.MASTER_KEY && password === process.env.MASTER_KEY) {
			//Note, if you want a master password, set one at the environment level.
			//Also note, this is a huge security risk, so turn if off in production.
		} else if (hashedPassword !== user.password) {
			return {
				error: "Incorrect Password"
			}
		}

		let sm = new SessionModel(this.req);
		let token = await sm.getToken(user, this.req);

		await this.update(user.id,
			{
				lastLogin: now()
			}
		);

		return {
			user: _.omit(user, ['id', 'password']),
			token: token
		}
	}

	async logout(token) {
		let sm = new SessionModel(this.req);
		return await sm.destroyWhere(
			{
				where: {
					token: token
				}
			}
		);
	}

	async lostPasswordStart(username) {
		let result = await this.findOne(
			{
				where: {
					or: [
						{username: username},
						{email: username}
					]
				}
			}
		);

		if (result) {
			let token = jwt.sign(
				{
					id: result.id,
					action: "lostPassword"
				},
				process.env.JWT_TOKEN_SECRET,
				{
					expiresIn: "1 hour"
				}
			);
			await this.update(
				result.id,
				{
					passwordResetToken: token,
					passwordResetTokenExpiresAt: moment().tz("UTC").add(1, "hours").toISOString()
				}
			);
			return {
				token: tok
			};
		}
	}

	async lostPasswordComplete(token, password) {
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
		} catch (e) {
			return {
				error: "Invalid token"
			}
		}
		if (decoded.action === "lostPassword") {
			let user = await this.read(decoded.id, {select: ['id', 'passwordResetToken', 'passwordResetTokenExpiresAt']});
			if (user.passwordResetToken === token) {
				let result = await this.update(
					user.id,
					{
						password: password,
						passwordResetToken: null,
						passwordResetTokenExpiresAt: null
					}
				);
				return result;
			}
		}
	}

	async updateEmailStart(id, email) {
		let result = await this.read(id);

		if (result) {
			let token = jwt.sign(
				{
					id: result.id,
					action: "changeEmail"
				},
				process.env.JWT_TOKEN_SECRET,
				{
					expiresIn: "1 hour"
				}
			);
			await this.update(
				result.id,
				{
					emailChangeCandidate: email,
					emailProofToken: token,
					emailProofTokenExpiresAt: moment().tz("UTC").add(1, "hours").toISOString()
				}
			);
		}
	}

	async updateEmailComplete(token) {
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
		} catch (e) {
			return {
				error: "Invalid token"
			}
		}
		if (decoded.action === "changeEmail") {
			let user = await this.read(decoded.id, {select: ['id', 'emailProofToken', 'emailProofTokenExpiresAt', 'emailChangeCandidate']});
			if (user.emailProofToken === token) {
				let result = await this.update(
					user.id,
					{
						email: result.emailChangeCandidate,
						emailProofToken: null,
						emailProofTokenExpiresAt: null
					}
				);
				return result;
			}
		}
	}

};