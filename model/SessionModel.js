const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../../schema/sessions-schema');
const validation = require('../../schema/validation/sessions-validation');
const fields = require('../../schema/fields/sessions-fields');
const getIpAddress = require("../helper/get-ip-address");
const jwt = require('jsonwebtoken');
const moment = require("moment");
const uuid = require("node-uuid");

module.exports = class SessionModel extends ModelBase {

	constructor(req) {
		super(schema, validation, fields, req);
	}

	static get schema() {
		return schema;
	}

	static get validation() {
		return validation;
	}

	static get fields() {
		return fields;
	}

	async index(query) {
		return await super.index(query);
	}

	async create(data) {
		return await super.create(data);
	}

	async read(id, query) {
		return await super.read(id, query);
	}

	async update(id, data, query) {
		return await super.update(id, data, query);
	}

	async query(query) {
		return await super.query(query);
	}

	async destroy(id) {
		return await super.destroy(id);
	}

	async getToken(userRecord, req, maxAge) {
		let userId = userRecord.id;
		let ipAddress = getIpAddress(req);
		let userAgent = req.headers['user-agent'];

		let sessions = await this.find(
			{
				where : {
					userId: {"=" : userRecord.id}
				},
				limit : 1
			}
		);

		if (sessions.length > 0) {
			let decoded;
			try {
				decoded = jwt.verify(this.token, process.env.JWT_TOKEN_SECRET);
			} catch (e) {
				decoded = null;
			}
			if (decoded) {
				console.log("recycling token");
				await this.update(
						{
							userId: userId,
							userAgent: userAgent,
							ipAddress: ipAddress
						},
						{
							expiresAt: moment().add('30', 'days').format("YYYY-MM-DD HH:mm:ss.SSS"),
						}
					);
				return this.token;
			} else {
				for (let i = 0; i < sessions.length; i++) {
					if (sessions[i].token === this.token) {
						console.log("removing expired token");
						try {
							await this.destroy(
									{
										token: this.token
									}
								)
						} catch (e) {
							console.log("Error removing expired");
						}
						break;
					}
				}
			}
		}

		// If no sessions then create new
		var obj = _.cloneDeep(userRecord);
		obj.ipAddress = ipAddress;
		obj.userAgent = userAgent;

		if (obj.password) {
			delete obj.password;
		}

		let token = jwt.sign(
			obj,
			process.env.JWT_TOKEN_SECRET,
			{
				expiresIn: "720 days"
			}
		);

		await this.create(
				{
					id: uuid.v4(),
					userId: userId,
					token: token,
					expiresAt: moment().add(30, 'days').format("YYYY-MM-DD HH:mm:ss.SSS"),
					userAgent: userAgent,
					ipAddress: ipAddress
				}
			);
		// All done.
		return token;
	}


	get relationMappings() {
		let User = require("./UserModel");
		return {
			user : {
				relation : "HasOne",
				modelClass: User,
				join: {
					from: "userId",
					to: "id"
				}
			}
		}
	}

}