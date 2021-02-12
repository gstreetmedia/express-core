module.exports = (ModelName)=> {

return `	
const ControllerBase = require('../core/controller/ControllerBase');
const _ = require('lodash');
const Model = require('../model/${ModelName}Model');

module.exports = class ${ModelName}Controller extends ControllerBase {
	constructor() {
		super(Model);
	}
	
	async create(req, res) {
		return await super.create(req, res);
	}

	async read(req, res) {
		return await super.read(req, res);
	}

	async update(req, res) {
		return await super.update(req, res);
	}

	async query(req, res) {
		return await super.query(req, res);
	}

	async destroy(req, res) {
		return await super.destroy(req, res);
	}
}`
}
