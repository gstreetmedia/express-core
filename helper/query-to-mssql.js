let QueryBase = require("./query-to-sql")

module.exports = class QueryToMSSql extends QueryBase{

	/**
	 *
	 * @returns {string}
	 */
	static get like() {
		return "like";
	}

	/**
	 *
	 * @returns {string}
	 */
	static get client() {
		return "mssql";
	}
}
