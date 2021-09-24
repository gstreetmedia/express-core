const _ = require('lodash');
const ControllerBase = require('./ControllerBase');
const Model = require("../model/KeyStoreModel");

module.exports = class KeyStoreController extends ControllerBase {

	/**
	 * @param {KeyStoreModel} model
	 */
	constructor(model) {
		super(model || Model);
	}

	/**
	 * @returns {KeyStoreModel}
	 * @constructor
	 */
	get Model() {
		return this._Model;
	}

	async getKey(req, res) {
		let m = new this.Model(req);
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
		let m = new this.Model(req);
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
