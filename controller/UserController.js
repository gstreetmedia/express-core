const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const hashPassword = require("../helper/hash-password");
const moment = require("moment-timezone");
const Model = require('../model/UserModel');

class UserController extends ControllerBase {
	/**
	 * @param {UserModel} model
	 */
	constructor(model) {
		super(model || Model);
	}

	async login(req, res) {

		let username = req.body.username || req.query.username || req.query.email || req.body.email;
		let password = req.body.password || req.query.password;

		if (!username || !password) {
			return res.error(
				{
					message : "Missing Credentials",
					statusCode : 401
				}
			)
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

		if (!req.locals.jwt && !req.locals.token) {
			return res.invalid("Missing Token");
		}

		let m = new this.Model(req);
		let result = await m.logout(req.locals.jwt ? req.locals.jwt : req.locals.token);

		res.clearCookie('token');
		res.clearCookie('application-key');

		return res.success("Logged Out");
	}

	async register(req, res) {
		let m = new this.Model(req);
		let result = await m.register(req.body);

		if (result.error) {
			return res.error(result.error);
		}

		return res.success(result);
	}

	async registerComplete(req, res) {
		let m = new this.Model(req);
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
		let result = await m.lostPasswordStart(req.body.email || req.body.username);
		if (result.error) {
			return res.error(result.error);
		}
		return res.success(result);
	}

	async lostPasswordComplete(req, res) {
		console.log("lostPassword Complete");
		if (!req.body.token) {
			return res.notFound();
		}

		let m = new this.Model(req);
		let result = await m.lostPasswordComplete(req.body.token, req.body.password);

		if (result.error) {
			return res.error(result.error);
		}

		return res.success(result);
	}

	async updatePassword(req, res) {
		let m = new this.Model();
		let record = await m.read(req.locals.user.id);
		if (!req.body.currentPassword) {
			return res.error(
				{
					message : "Must send current password.",
					statusCode : 401
				}
			)
		}
		if (hashPassword(req.body.currentPassword) !== record.password) {
			return res.error(
				{
					message : "Current password does not match.",
					statusCode : 401
				}
			)
		}
		let result = await m.update(req.locals.user.id, {password:req.body.password});

		if (result.error) {
			return res.error(result.error);
		}
		return res.success(result.error);
	}

	async updateEmailStart(req, res) {
		let m = new this.Model(req);
		if (!req.body.email) {
			return res.invalid(
				{
					message : "Please send an email"
				}
			)
		}
		let result = await m.updateEmailStart(req.locals.user.id, req.body.email);
		if (result.error) {
			return res.error(result.error);
		}
		return res.success(result);
	}

	async updateEmailComplete(req, res) {
		if (!req.body.token) {
			return res.notFound(
				{
					message : "Missing Token"
				}
			);
		}
		let m = new this.Model(req);
		let result = await m.updateEmailComplete(req.body.token);
		if (result.error) {
			return res.error(result.error);
		}
		return res.success(result);
	}

}

module.exports = UserController;
