const QueryBase = require("./query-to-base");
const _ = require("lodash");
const moment = require("moment-timezone");
const knex = require("knex");

module.exports = class QueryToPgSql extends QueryBase{


	/**
	 *
	 * @returns {string}
	 */
	get like() {
		return "ilike";
	}

	/**
	 *
	 * @returns {string}
	 */
	get client() {
		return "pg";
	}

	/**
	 * Process a text[] int[] real[] column
	 * @param key
	 * @param compare
	 * @param value
	 * @param sqlBuilder
	 */
	processObjectColumn(key, compare, value, sqlBuilder) {

		let columnName;

		if (this.properties[key] && this.properties[key].columnName) {
			columnName = this.properties[key].columnName;
		} else {
			/*
			select
			  id,
			  sync.record -> 'listing' ->> 'ExpirationDate' as "expiration_date"
			from sync where
			  sync.record -> 'listing' ->> 'ExpirationDate' < '2018-12-08'
			 */
			if (key.indexOf(".") !== -1) {
				let parts = key.split(".");
				key = parts[0];
				let as = "";
				if (this.properties[key] && this.properties[key].columnName) {
					columnName = this.properties[key].columnName;
					as = columnName;
					parts.shift();
					for (let i = 0; i < parts.length; i++) {
						if (i + 1 === parts.length) {
							columnName += " ->> '" + parts[i] + "'";
						} else {
							columnName += " -> '" + parts[i] + "'";
						}
						as += "." + parts[i];
					}
					sqlBuilder.select(this.raw(this.tableName + "." + columnName + " as \"" + as + "\""));
				} else {
					return;
				}
			} else {
				return;
			}
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
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), ">", this.processType(value, this.properties[key]));
				break;
			case "gte" :
			case ">=" :
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), ">=", this.processType(value, this.properties[key]));
				break;
			case "lt" :
			case "<" :
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), "<", this.processType(value, this.properties[key]));
				break;
			case "lte" :
			case "<=" :
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), "<=", this.processType(value, this.properties[key]));
				break;
			case "in" :
				sqlBuilder.whereIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				break;
			case "nin" :
				sqlBuilder.whereNotIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				break;
			case "endsWith" :
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), this.like, "%" + value); //todo postgres only
				break;
			case "startsWith" :
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), this.like, value + "%"); //todo postgres only
				break;
			case "contains" :
				sqlBuilder.where(this.raw(this.tableName + "." + columnName), this.like, "%" + value + "%"); //todo postgres only
				break;
			case "=" :
			case "==" :
			case "eq" :
				if (value === null) {
					sqlBuilder.whereNull(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					sqlBuilder.whereIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				} else {
					sqlBuilder.where(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				}

				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					sqlBuilder.whereNotNull(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					sqlBuilder.whereNotIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				} else {
					sqlBuilder.whereNot(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				}
				break;
			case "or" :
			case "and" :
				/**
				 * or : [
				 *  {field1: val1},
				 *  {field2 {">":val2}
			        * ]
				 */
				sqlBuilder[compare === "or" ? "orWhere" : "where"](
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
								innerValue = value[i][innerKey][innerCompare];
							} else {
								innerValue = value[i][innerKey];
							}

							this.processCompare(innerKey, innerCompare, innerValue, builder);
						}
					}
				);
				break;
			default :
				if (value === null) {
					sqlBuilder.whereNull(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					sqlBuilder.whereIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				} else {
					sqlBuilder.where(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				}
		}
	}


	/**
	 * Process a JSONB Column
	 * @param key
	 * @param compare
	 * @param value
	 * @param sqlBuilder
	 */
	processArrayColumn(key, compare, value, sqlBuilder, isOr) {

		let context = this;

		let columnName;
		if (this.properties[key] && this.properties[key].columnName) {
			columnName = this.properties[key].columnName;
		} else {
			return;
		}

		let columnType = this.properties[key].type;

		let c = {
			where : "where",
			whereIn : "whereIn",
			whereNotIn : "whereNotIn",
			whereNull : "whereNull",
			whereNot : "whereNot",
			whereNotNull : "whereNotNull"
		}

		if (isOr) {
			c = {
				where : "orWhere",
				whereIn : "orWhereIn",
				whereNotIn : "orWhereNotIn",
				whereNull : "orWhereNull",
				whereNot : "orWhereNot",
				whereNotNull : "orWhereNotNull"
			}
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
				sqlBuilder[c.where](this.raw(this.processType(value, this.properties[key]) + " > ANY(" + columnName + ")"));
				break;
			case "gte" :
			case ">=" :
				sqlBuilder[c.where](this.raw(this.processType(value, this.properties[key]) + " >= ANY(" + columnName + ")"));
				break;
			case "lt" :
			case "<" :
				sqlBuilder[c.where](this.raw(this.processType(value, this.properties[key]) + " < ANY(" + columnName + ")"));
				break;
			case "lte" :
			case "<=" :
				sqlBuilder[c.where](this.raw(this.processType(value, this.properties[key]) + " <= ANY(" + columnName + ")"));
				break;
			case "in" :

				let command;
				switch (this.properties[key].format) {
					case "uuid" :
					case "string" :
						command = columnName + "::text @> ARRAY['"+value.join("','")+"']::text";
						break;
					case "integer" :
						command = columnName + "::int @> ARRAY["+value.join(",")+"]::int";
						break;
					case "number" :
						command = columnName + "::float @> ARRAY["+value.join(",")+"]::float";
						break;
					default :
						command = columnName + "::text @> ARRAY['"+value.join("','")+"']::text";
				}

				
				sqlBuilder[c.where](this.raw(command));

				/*
				sqlBuilder[c.where](
					(builder) => {
						value.forEach(
							function (val) {
								builder.orWhere(context.knexRaw(context.processType(val, this.properties[key]) + " = ANY(" + columnName + ")"));
							}
						)
					}
				);
				*/

				break;
			case "nin" :

				let command;
				switch (this.properties[key].format) {
					case "uuid" :
					case "string" :
						command = columnName + "::text @> ARRAY['"+value.join("','")+"']::text";
						break;
					case "integer" :
						command = columnName + "::int @> ARRAY["+value.join(",")+"]::int";
						break;
					case "number" :
						command = columnName + "::float @> ARRAY["+value.join(",")+"]::float";
						break;
					default :
						command = columnName + "::text @> ARRAY['"+value.join("','")+"']::text";
				}


				sqlBuilder[c.whereNot](this.raw(command));


				/*
				sqlBuilder.where(
					(builder) => {
						value.forEach(
							function (val) {
								builder.where(context.knexRaw(context.processType(val, this.properties[key]) + " != ANY(" + columnName + ")"));
							}
						)
					}
				)
				*/
				break;
			case "=" :
			case "==" :
			case "eq" :
				sqlBuilder.where(this.raw(this.processType(value, this.properties[key]) + " = ANY(" + columnName + ")"));
				break;
			case "!" :
			case "!=" :
			case "ne" :
				sqlBuilder.where(this.raw(this.processType(value, this.properties[key]) + " = ANY(" + columnName + ")"));
				break;
				break;
			case "or" :
				/**
				 * or : [
				 *  {field1: val1},
				 *  {field2 {">":val2}
			        * ]
				 */
				sqlBuilder[compare === "or" ? "orWhere" : "where"](
					(builder) => {
						for (let i = 0; i < value.length; i++) {
							let innerCompare = "";
							let innerValue;
							let innerKey = Object.keys(value[i])[0];

							if (typeof value[i][innerKey] === "object") {
								innerCompare = Object.keys(value[i][innerKey])[0];
							}

							if (innerCompare !== "") {
								innerValue = value[i][innerKey][innerCompare];
							} else {
								innerValue = value[i][innerKey];
							}

							this.processCompare(innerKey, innerCompare, innerValue, builder);
						}
					}
				);
				break;
			default :
				if (value === null) {
					sqlBuilder.whereNull(this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					value.forEach(
						function (val) {
							sqlBuilder.orWhere(context.knexRaw(context.processType(val, this.properties[key]) + " != ANY(" + columnName + ")"));
						}
					)
				} else {
					sqlBuilder.where(knex.raw(this.processType(value, this.properties[key]) + " = ANY(" + columnName + ")"));
				}
		}
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
					case "geometry" :
						//console.log("GEOMETRY!!!!!!!!! => " + value);
						if (value) {
							return this.raw(value); //need to just do this by hand
						} else {
							return null;
						}


						break;
					default :
						try {
							return _.isObject(value) ? JSON.stringify(value) : value;
						} catch (e) {
							return null;
						}
				}

				break;
			case "array" :
				//TODO figure out a way to check in the types of each array item
				if (!value) {
					return value;
				}
				if (value === '') {
					return null;
				}
				if (isInsertOrUpdate) {
					switch (property.format) {
						case "string" :
							return this.raw("ARRAY['" + value.join("','") + "']");
							break;
						case "uuid" :
							return this.raw("ARRAY['" + value.join("','") + "']::uuid[]");
							break;
						default :
							return this.raw("ARRAY[" + value.join(",") + "]");

					}
				}
				if (_.isArray(value)) {
					if (property.format === "string" || property.format === "uuid") {
						return "{'" + value.join("','") + "'}";
					} else {
						return "{" + value.join(",") + "}";
					}
				} else {
					if (property.format === "string") {
						return "'" + value + "'";
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
							try {
								if (moment(value).isValid()) {
									return value;
								}
							} catch (e) {

							}
							return null;
						case "uuid" :
							if (value === "") {
								return null;
							}
							return value;
						default :
							//return this.decodeQuery(value).trim();
							return value.trim();
					}
				} else {
					return _.isString(value) ? value.trim() : value;
				}
				break;
		}
		return value;
	}

	/**
	 * Where in, nin conditions are present, the options need to be parsed to the correct data-type
	 * @param {string|array} list - a string is array of values. string should be comma separated
	 * @param {Object} property - a singular item in json schema
	 * @returns {Array}
	 */
	processArrayType(list, property) {
		let context = this;
		if (!_.isArray(list)) {
			list = list.split(",");
		}
		var valueList = [];
		list.forEach(
			function (item) {
				let v = context.processType(item, property);
				if (v) {
					valueList.push(v);
				}
			}
		);

		return valueList;
	}
}
