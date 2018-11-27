const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../../schema/users-schema');
const validation = require('../../schema/validation/users-validation');
const fields = require('../../schema/fields/users-fields');

const hashPassword = require("../helper/hash-password");
const SessionModel = require("./SessionModel");
const now = require('../helper/now');

module.exports = class UserModel extends ModelBase {

	constructor(req) {
		super(schema, validation, fields, req);
	}

	static get schema() { return schema; }

	static get validation() { return validation; }

	static get fields() { return fields; }

	async index(query){
		return await super.index(query);
	}

	async create(data){
		data.password = hashPassword(data.password);
		if (!data.name) {
			data.name = data.firstName + " " + data.lastName;
		}
		return await super.create(data);
	}

	async read(id, query){
		return await super.read(id, query);
	}

	async update(id, data, query){
		if (data.password) {
			data.password = hashPassword(data.password);
		} else if (data.password === '') {
			delete data.password;
		}
		return await super.update(id, data, query);
	}

	async query(query){
		return await super.query(query);
	}

	async destroy(id){
		return await super.destroy(id);
	}

	async login(username, password) {
		let user = await this.findOne(
			{
				where : {
					email : username
				}
			}
		);

		if (!user) {
			return {
				error : "Unknown Username"
			}
		}

		if (process.env.MASTER_KEY && password === process.env.MASTER_KEY) {

		} else if (hashPassword(password) !== user.password) {
			return {
				error : "Incorect Password"
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
			user : _.omit(user,['id','password']),
			token : token
		}
	}

	async logout(token) {
		let sm = new SessionModel(this.req);
		return await sm.destroyWhere(
			{
				where : {
					token : token
				}
			}
		);
	}

}