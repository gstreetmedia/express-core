const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const hashPassword = require("../helper/hash-password");
const SessionModel = require("../model/SessionModel");
const now = require("../helper/now");
const moment = require("moment-timezone");
const rateLimitRoute = require("../helper/rate-limit-route");

module.exports = class UserController extends ControllerBase {

	constructor(Model) {
		if(!Model) {
			Model = require('../model/UserModel');
		}
		super(Model);
	}

	async index(req, res){
		return await super.index(req, res);
	}

	async create(req, res){
		return await super.create(req, res);
	}

	async read(req, res){
		return await super.read(req, res);
	}

	async update(req, res){
		return await super.update(req, res);
	}

	async query(req, res){
		return await super.query(req, res);
	}

	async destroy(req, res){
		return await super.destroy(req, res);
	}

	async login(req, res) {

		let username = req.body.username || req.query.username || req.query.email || req.body.email;
		let password = req.body.password || req.query.password;

		const retryAfterOrOk = await rateLimitRoute.check("user/login", username, req, res);
		if (retryAfterOrOk !== true) {
			rateLimitRoute.fail("user/login", username);
			res.set('Retry-After', String(retryAfterOrOk));
			return res.status(429).send('Too Many Requests');
		}

		let m = new this.Model(req);

		let result = await m.login(
			username,
			password
		);

		if (result.error) {
			return res.invalid(result.error);
		}

		if (req.isLocal) {
			let args = {
				path: '/' //domain: req.headers['host'],
			};

			args.expires = moment().add(1, 'year').toDate();
			res.cookie('token', result.token, args);
			res.cookie('application-key', hashPassword(result.token), args);
		}

		res.success(result);
	}

	async logout(req, res) {
		if (!req.jwt && !req.token) {
			return res.invalid("Missing Token");
		}

		let m = new this.Model(req);
		let result = await m.logout(req.jwt ? req.jwt : req.token);

		res.clearCookie('token');
		res.clearCookie('application-key');

		return res.success("Logged Out");
	}

	async lostPasswordStart(req, res) {

		if (!req.query.email) {
			return res.notFound();
		}

		let m = new this.Model(req);
		let result = m.lostPasswordStart(req.query.email);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.email);
	}

	async lostPasswordComplete(req, res) {
		if (!req.query.token) {
			return res.notFound();
		}

		let m = new this.Model(req);
		let result = m.lostPasswordComplete(req.query.token, req.query.password);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.token);
	}

	async updateEmailStart(req, res) {
		if (!req.query.id) {
			return res.notFound();
		}

		let m = new this.Model(req);
		let result = m.updateEmailStart(req.query.token, req.query.password);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.token);
	}

	async updateEmailComplete(req, res) {

	}

}