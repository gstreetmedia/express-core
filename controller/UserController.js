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

		let m = new Model();
		let user = await m.findOne(
			{
				where : {
					email : req.body.email
				}
			}
		);

		if (!user) {
			return res.invalid("Unknown Email");
		}

		if (process.env.MASTER_KEY && req.body.password === process.env.MASTER_KEY) {

		} else if (hashPassword(req.body.password) !== user.password) {
			return res.invalid("Incorrect Password");
		}

		let sm = new SessionModel(req);
		let token = await sm.getToken(user, req);

		await m.update(user.id,
			{
				lastLogin: now()
			}
		);

		if (req.isLocal) {
			let args = {
				path: '/' //domain: req.headers['host'],
			};

			args.expires = moment().add(1, 'year').toDate();
			res.cookie('token', token, args);
			res.cookie('application-key',hashPassword(token), args);
		}

		user = _.omit(user,['id','password']);

		res.success(
			{
				user : user,
				token: token
			});
	}

}