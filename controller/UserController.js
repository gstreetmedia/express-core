const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require('../model/UserModel');
const hashPassword = require("../helper/hash-password");
const SessionModel = require("../model/SessionModel");
const now = require("../helper/now");
const moment = require("moment-timezone");

module.exports = class UserController extends ControllerBase {

	constructor() {
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

		let m = new Model(req);

		console.log(req.body);

		let result = await m.login(
			req.body.email,
			req.body.password
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
			res.cookie('application-key',hashPassword(result.token), args);
		}

		res.success(result);
	}

	async logout(req, res) {
		if (!req.jwt) {
			return res.invalid("Missing Token");
		}

		let m = new Model(req);
		let result = await m.logout(req.jwt);

		res.clearCookie('token');
		res.clearCookie('application-key');

		return res.success("Logged Out");
	}

	async passwordReset(req, res) {

	}

	async updatePassword(req, res) {

	}

}