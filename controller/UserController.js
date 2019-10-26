const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const hashPassword = require("../helper/hash-password");
const SessionModel = require("../model/SessionModel");
const now = require("../helper/now");
const moment = require("moment-timezone");
const Model = require("../../model/UserModel");

module.exports = class UserController extends ControllerBase {

	constructor() {
		super(Model);
	}

	async index(req, res){
		return await super.index(req, res);
	}

	async create(req, res){
		return super.create(req, res);
	}

	async read(req, res){
		return super.read(req, res);
	}

	async update(req, res){
		return super.update(req, res);
	}

	async query(req, res){
		return super.query(req, res);
	}

	async destroy(req, res){
		return super.destroy(req, res);
	}

	async login(req, res) {

		let username = req.body.username || req.query.username || req.query.email || req.body.email;
		let password = req.body.password || req.query.password;

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
				path: '/',
				domain: req.headers['host'].split(":")[0]
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

	async register(req, res) {
		let m = new this.Model();
		let result = await m.register(req.body);

		if (result.error) {
			return res.error(result.error);
		}

		return res.success(result);

	}

	async registerComplete(req, res) {
		let m = new this.Model();
		let result = await m.registerComplete(req.body.token, req.body.password);

		if (result.error) {
			return res.error(result.error);
		}

		return res.success(result);
	}

	async lostPasswordStart(req, res) {
		if (!req.body.email && !req.body.username) {
			return res.notFound();
		}

		let m = new this.Model(req);
		let result = m.lostPasswordStart(req.body.email || req.body.username);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.email);
	}

	async lostPasswordComplete(req, res) {
		if (!req.body.token) {
			return res.notFound();
		}

		let m = new this.Model(req);
		let result = m.lostPasswordComplete(req.body.token, req.body.password);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.token);
	}

	async updateEmailStart(req, res) {
		let m = new this.Model(req);
		let result = m.updateEmailStart(req.body.email);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.token);
	}

	async updateEmailComplete(req, res) {
		if (!req.query.token) {
			return res.notFound();
		}
		let m = new this.Model(req);
		let result = m.updateEmailComplete(req.body.token);
		if (!result.error) {
			return res.success(result);
		}
		return res.notFound(req.query.token);
	}


}