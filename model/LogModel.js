
const ModelBase = require('./ModelBase');
const _ = require('lodash');

class LogModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	/**
	 * The name of the table used by this Model Class
	 * @returns {string}
	 */
	get tableName() {
		return '_log';
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
		return await super.update(id, data, fetch);
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
};

module.exports = LogModel;
