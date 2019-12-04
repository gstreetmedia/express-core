const ModelBase = require('./ModelBase');
const _ = require('lodash');

const getIpAddress = require("../helper/get-ip-address");
const jwt = require('jsonwebtoken');
const moment = require("moment");
const uuid = require("node-uuid");
const now = require("../../core/helper/now");

class SessionModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return SessionModel.tableName;
	}

	static get tableName() {
		return "sessions";
	}

	static get schema() { return ModelBase.getSchema(SessionModel.tableName); }

	static get fields() { return ModelBase.getFields(SessionModel.tableName); }

	async index(query) {
		return await super.index(query);
	}

	async create(data) {
		console.log("SM::create");
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

	async destroyWhere(query) {
		return await super.destroyWhere(query);
	}

	/**
	 * Scrub extra session for this user
	 * @param userId
	 * @returns {Promise<void>}
	 */
	async houseKeeping(userId) {
		let now = new moment().tz("UTC");

		let sessions = await this.find(
			{
				where : {
					userId: userId
				},
				sort : "expiresAt asc"
			}
		);

		let token = null;

		if (sessions.length > 0) {
			let validSessions = [];
			for (let i = 0; i < sessions.length; i++) {
				let decoded;

				try {
					decoded = jwt.decode(sessions[i].token, process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET);
				} catch (e) {
					decoded = null;
				}

				let expiresAt = moment(sessions[i].expiresAt);

				if (decoded && expiresAt.isAfter(now)) {
					validSessions.push(sessions[i]);
				} else {
					let result = await this.destroy(sessions[i].id);
				}
			}

			let maxSessions = (process.env.CORE_MAX_USER_SESSIONS || 1);

			while (validSessions.length > maxSessions - 1) {
				await this.destroy(validSessions[0].id);
				validSessions.shift();
			}
		}
	}

	/**
	 * Get a session token for this user record
	 * @param data - can be anything, but should include at least the user.id as either data.id or data.user.id or data.userId
	 * @param req
	 * @param maxAge
	 * @returns {Promise<*>}
	 */
	async getToken(userId, data, req, maxAge) {

		data = _.cloneDeep(data);

		if (!userId) {
			throw new Error(
				"Cannot create session without user id"
			)
		}

		let ipAddress = getIpAddress(req);
		let userAgent = req.headers['user-agent'];

		await this.houseKeeping(userId);

		data.ipAddress = ipAddress;
		data.userAgent = userAgent;

		if (data.password) {
			delete data.password;
		}

		let token = jwt.sign(
			{
				id : userId,
				data : data,
				systemId : process.env.JWT_TOKEN_SYSTEM_ID || process.env.CORE_JWT_TOKEN_SYSTEM_ID || "core"
			},
			process.env.JWT_TOKEN_SECRET || process.env.CORE_JWT_TOKEN_SECRET,
			{
				expiresIn: process.env.CORE_JWT_DURATION || "30 days"
			}
		);

		let result = await this.create(
			{
				id: uuid.v4(),
				userId: userId,
				token: token,
				expiresAt: moment().add(30, 'days').format("YYYY-MM-DD HH:mm:ss.SSS"),
				userAgent: userAgent,
				ipAddress: ipAddress
			}
		);
		console.log(result);
		// All done.
		return token;
	}

	async verifyToken(token) {
		let decoded;

		try {
			decoded = jwt.decode(token);
		} catch (e) {
			return {
				error : {
					message : "Could not decoded token",
					statusCode : 401
				}
			}
		}

		let result = await this.findOne(
			{
				where : {
					token : token,
					expiresAt : {">" : now()}
				}
			}
		);

		if (result) {
			return result;
		}

		return {
			error : {
				message : "Could not find token",
				statusCode : 404
			}
		};
	}


	get relations() {
		return {
			user : {
				relation : "HasOne",
				modelClass : "UserModel",
				join : {
					from : "userId",
					to : "id"
				}
			}
		}
	}

	get foreignKeys () {
		return {
			userId : {
				modelClass : "UserModel",
				to : "id"
			}
		}
	}

}

module.exports = SessionModel;