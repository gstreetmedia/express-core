const QueryBase = require("./query-to-base");
const _ = require("lodash");
const moment = require("moment-timezone");

module.exports = class QueryToSql extends QueryBase{

	/**
	 *
	 * @returns {string}
	 */
	get like() {
		return "like";
	}

	/**
	 *
	 * @returns {string}
	 */
	get client() {
		return "mysql";
	}

}
