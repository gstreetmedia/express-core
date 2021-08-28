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

	get wrap() {
		return '`';
	}

	buildSelect (key) {
		return this.knexRaw('`' + this.tableName + '`.`' + this.properties[key].columnName + '` as `' + key + '`');
	}

	/**
	 * Incoming values are pretty much all going to be strings, so let's parse that out to be come correct types
	 * @param value
	 * @param {Object} property - a single json schema property
	 * @returns {*}
	 */
	processType(value, property, isInsertOrUpdate) {
		let context  = this;

		switch (property.type) {
			case "object" :
				switch (property.format) {
					default :
						try {
							return _.isObject(value) ? JSON.stringify(value) : value;
						} catch (e) {
							return null;
						}
				}
				break;
			case "array" :
				if (_.isArray(value)) {
					if (property.format === "string") {
						return '["' + value.join('","') + '"]';
					} else {
						return "[" + value.join(",") + "]";
					}
				} else {
					if (property.format === "string") {
						return '["' + value + '"]';
					} else {
						return value;
					}
				}

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
				if (typeof value === "string") {
					return value === "1" || value === "true";
				} else {
					return value;
				}
				break;
			case "string" :
				if (property.format) {
					switch (property.format) {
						case "date-time" :
							if (moment(value).isValid()) {
								return value.split("T").join(" ").split(".")[0]; //mysql does not support milliseconds
							}
							return null;
						case "uuid" :
							if (value === "") {
								return null;
							}
							return value;
						default :
							return this.decodeQuery(value).trim();
					}
				} else {
					return _.isString(value) ? value.trim() : value;
				}
				break;
		}
		return value;
	}

	buildSort(propertyName) {
		if (this.properties[propertyName]) {
			return this.knexRaw('`' + this.tableName + '`.`' + this.properties[propertyName].columnName + '`');
		}
		return null;
	}

	/**
	 * Append tableName to column to stop ambiguity
	 * @param column
	 * @returns {*|Knex.Raw<any>}
	 */
	column(column) {
		return this.raw('`' + this.tableName + '`.`' + column + '`');
	}

}
