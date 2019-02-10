const QueryBase = require("./query-to-base");
const _ = require("lodash");
const moment = require("moment-timezone");

module.exports = class QueryToSql extends QueryBase{

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
		return "mysql";
	}

	/**
	 *
	 * @param {string} key - the field key
	 * @param {string} compare - the comparitor, gt, >, < lt, !, != etc
	 * @param {varies} value - the string, array, number, etc
	 * @param {Object} properties - the properties of this model from a JSON schema
	 * @param {Object} sqlBuilder - the current knex sqlBuilder
	 */
	static processCompare(table, key, compare, value, properties, sqlBuilder) {

		let columnName;
		if (properties[key] && properties[key].columnName) {
			columnName = properties[key].columnName;
		} else {
			return;
		}

		switch (compare) {
			case "inside" :
			case "near" :
			case "radius" :
			case "poly" :
			case "geohash" :
			case "box" :
				//TODO integrate geo query functions
				break;
			case "gt" :
			case ">" :
				sqlBuilder.where(knex.raw(table + "." + columnName), ">", QueryToSql.processType(value, properties[key]));
				break;
			case "gte" :
			case ">=" :
				sqlBuilder.where(table + "." +columnName, ">=", QueryToSql.processType(value, properties[key]));
				break;
			case "lt" :
			case "<" :
				sqlBuilder.where(table + "." +columnName, "<", QueryToSql.processType(value, properties[key]));
				break;
			case "lte" :
			case "<=" :
				sqlBuilder.where(table + "." +columnName, "<=", QueryToSql.processType(value, properties[key]));
				break;
			case "in" :
				sqlBuilder.whereIn(table + "." +columnName, QueryToSql.processArrayType(value, properties[key]));
				break;
			case "nin" :
				sqlBuilder.whereNotIn(table + "." +columnName, QueryToSql.processArrayType(value, properties[key]));
				break;
			case "endsWith" :
				sqlBuilder.where(table + "." +columnName, QueryToSql.like, "%" + value); //todo postgres only
				break;
			case "startsWith" :
				sqlBuilder.where(table + "." +columnName, QueryToSql.like, value + "%"); //todo postgres only
				break;
			case "contains" :
				sqlBuilder.where(table + "." +columnName, QueryToSql.like, "%" + value + "%"); //todo postgres only
				break;
			case "==" :
			case "eq" :
				if (value === null) {
					sqlBuilder.whereNull(table + "." +columnName, QueryToSql.processType(value, properties[key]));
				} else if (_.isArray(value)) {
					sqlBuilder.whereIn(table + "." +columnName, QueryToSql.processArrayType(value, properties[key]));
				} else {
					sqlBuilder.whereNot(table + "." +columnName, QueryToSql.processType(value, properties[key]));
				}
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					sqlBuilder.whereNotNull(table + "." +columnName, QueryToSql.processType(value, properties[key]));
				} else if (_.isArray(value)) {
					sqlBuilder.whereNotIn(table + "." +columnName, QueryToSql.processArrayType(value, properties[key]));
				} else {
					sqlBuilder.whereNot(table + "." +columnName, QueryToSql.processType(value, properties[key]));
				}
				break;
			case "or" :
				/**
				 * or : [
				 *  {field1: val1},
				 *  {field2 {">":val2}
			        * ]
				 */
				sqlBuilder.where(
					(builder) => {
						for (let i = 0; i < value.length; i++) {
							let innerCompare = "";
							let innerValue;
							let innerKey = Object.keys(value[i])[0];
							let innerColumnName;

							if (typeof value[i][innerKey] === "object") {
								innerCompare = Object.keys(value[i][innerKey])[0];
							}

							if (innerCompare !== "") {
								innerValue = value[i][innerKey][compare];
							} else {
								innerValue = value[i];
							}

							//compare, columnName, key, value, properties, sqlBuilder
							QueryToSql.processCompare(innerKey, innerCompare, innerValue, properties, builder)
						}
					}
				);
				break;
			default :
				if (value === null) {
					sqlBuilder.whereNull(table + "." +columnName, QueryToSql.processType(value, properties[key]));
				} else if (_.isArray(value)) {
					sqlBuilder.whereIn(table + "." +columnName, QueryToSql.processArrayType(value, properties[key]));
				} else {
					sqlBuilder.whereRaw(table + "." +columnName + " = ?", QueryToSql.processType(value, properties[key]));
				}
		}
	}


	/**
	 * Incoming values are pretty much all going to be strings, so let's parse that out to be come correct types
	 * @param value
	 * @param {Object} property - a single json schema property
	 * @returns {*}
	 */
	static processType(value, property) {
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
