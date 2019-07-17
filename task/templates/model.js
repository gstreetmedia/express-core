module.exports = (ModelName, TableName) => {
return `
const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');

module.exports = class ${ModelName}Model extends ModelBase {

	constructor(req) {
		super(req);
	}

	/**
	 * The name of the table used by this model instance
	 * @returns {string}
	 */
	get tableName() {
		return ${ModelName}Model.tableName;
	}
	
	/**
	 * The name of the table used by this Model Class
	 * @returns {string}
	 */
	static get tableName() {
		return '${TableName}';
	}

	/**
	 * Get the schema used by this Model Class
	 * @returns {{}}
	 */
	static get schema() {
		return ModelBase.getSchema(${ModelName}Model.tableName);
	}

	/**
	 * Get the available Fields for this Model Class
	 * @returns {{}}
	 */
	static get fields() {
		return ModelBase.getFields(${ModelName}Model.tableName);
	}

	/**
	 * @param {object} query
	 * @returns {Promise<*>}
	 */
	async index(query) {
		return await super.index(query);
	}

	/**
	 * @param {object} query
	 * @returns {Promise<*>}
	 */
	async create(data) {
		return await super.create(data);
	}

	/**
	 * @param {string|int} id
	 * @param {object} query
	 * @returns {Promise<*>}
	 */
	async read(id, query) {
		return await super.read(id, query);
	}

	/**
	 * @param {string|int} id
	 * @param {object} data
	 * @param {boolean} fetch
	 * @returns {Promise<*>}
	 */
	async update(id, data, fetch) {
		return await super.update(id, data, query);
	}

	/**
	 * @param {object} query
	 * @returns {Promise<*>}
	 */
	async query(query) {
		return await super.query(query);
	}

	/**
	 * @param {string|int} id
	 */
	async destroy(id) {
		return await super.destroy(id);
	}

	/**
	 *
	 * @returns {{}}
	 */
	get relations() {
		return {};
	}

	/**
	 *
	 * @returns {{}}
	 */
	get foreignKeys() {
		return {};
	}
};`
}