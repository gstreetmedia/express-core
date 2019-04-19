const QueryBase = require("./query-to-base");
const _ = require("lodash");
const moment = require("moment-timezone");

module.exports = class QueryToSql extends QueryBase {

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
		return "mssql";
	}


	processContains(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;

		if (columnType === "number") {
			return this.raw("CAST(" + this.tableName + "." + columnName + " as NVARCHAR(MAX)) LIKE '%" + value + "%'")
		} else {
			return this.raw("LOWER(" + this.tableName + "." + columnName + ") LIKE LOWER('%" + value + "%')")
		}
	}

	processStartsWith(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;
		if (columnType === "number") {
			return this.raw("CAST(" + this.tableName + "." + columnName + " as NVARCHAR(MAX)) LIKE '" + value + "%'")
		} else {
			return this.raw("LOWER(" + this.tableName + "." + columnName + ") LIKE LOWER('" + value + "%')")
		}
	}

	processEndsWith(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;
		if (columnType === "number") {
			return this.raw("CAST(" + this.tableName + "." + columnName + " as NVARCHAR(MAX)) LIKE '%" + value + "'")
		} else {
			return this.raw("LOWER(" + this.tableName + "." + columnName + ") LIKE LOWER('%" + value + "')")
		}
	}

	/**
	 * Incoming values are pretty much all going to be strings, so let's parse that out to be come correct types
	 * @param value
	 * @param {Object} property - a single json schema property
	 * @returns {*}
	 */
	processType(value, property) {
		switch (property.type) {
			case "object" :
				try {
					return _.isObject(value) ? JSON.stringify(value) : value;
				} catch (e) {
					return null;
				}
				break;
			case "number" :
				if (!_.isNumber(value)) {
					if (property.type && property.type === "integer") {
						value = parseInt(value);
						if (!isNaN(value)) {
							return value;
						}
					} else {
						value = parseFloat(value);
						if (!isNaN(value)) {
							return value;
						}
					}
					return null;
				}
				return value;
				break;
			case "boolean" :
				return value === "1" || value === "true";
				break;
			case "string" :
				if (value === "") {
					return "";
				}
				if (property.format) {
					switch (property.format) {
						case "date-time" :
							var m = moment(value);
							if (m) {
								return m.format("YYYY-MM-DD HH:mm:ss")
							}
							return null;
						default :
							return QueryToSql.decodeQuery(value).trim();
					}
				} else {
					return _.isString(value) ? value.trim() : value;
				}
				break;
		}
		return value;
	}

}
