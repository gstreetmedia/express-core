const ControllerBase = require('./ControllerBase');
const _ = require('lodash');
const Model = require('../model/KeyStoreModel');

module.exports = class KeyStoreController extends ControllerBase {

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

	async getKey(req, res) {
		let m = new Model(req);
		let result = await m.get(req.params.key);
		if (result) {
			return res.success({
				value : result
			})
		}
		return res.success({
			value : null
		})
	}

	async setKey(req, res) {
		let m = new Model(req);
		let result = await m.set(req.params.key, req.body.value, req.body.ttl);
		if (result && !result.error) {
			return res.success(result)
		}
		if (!result) {
			return res.error({message:"DB Failure Create Key", statusCode: 500})
		}
		return res.error(result.error);
	}

}
