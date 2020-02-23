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
	 * @param queryBuilder
	 */
	processObjectColumn(key, compare, value, queryBuilder, isOr) {

		//console.log("processObjectColumn");

		let columnName;
		let fieldQuery = "";
		let fieldName;
		let as = "";

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

		if (this.properties[key] && this.properties[key].columnName) {
			columnName = this.properties[key].columnName;
		} else {
			if (key.indexOf(".") !== -1) {
				let parts = key.split(".");
				key = parts[0];

				if (this.properties[key] && this.properties[key].columnName) {
					columnName = this.properties[key].columnName;
					as = columnName;
					parts.shift();
					for (let i = 0; i < parts.length; i++) {
						if (i + 1 === parts.length) {
							fieldQuery += " ->> '" + parts[i] + "'";
						} else {
							fieldQuery += " -> '" + parts[i] + "'";
						}
						as += "." + parts[i];
					}
					fieldName = parts[parts.length-1];
					//sqlBuilder.select(this.raw(this.tableName + "." + columnName + " as \"" + as + "\""));
				} else {
					console.log("no object column named " + key);
					return;
				}
			} else {
				return;
			}
		}

		console.log("compare " + isOr);

		switch (compare) {
			case "inside" :
			case "near" :
			case "radius" :
			case "poly" :
			case "geohash" :
			case "box" :
				//TODO integrate geo query functions
				break;
			case ">" :
			case ">=" :
			case "<" :
			case "<=" :
				queryBuilder[c.where](
					this.raw(
						"(EXISTS(" +
						"SELECT " +
						"FROM jsonb_array_elements("+this.tableName+"." + columnName + ") " + columnName +  "1 " +
						"WHERE (" + columnName +  "1" + fieldQuery + ") " + compare + " '" + value + "' " +
						") OR " +
						this.tableName + "." + columnName + fieldQuery + " " + compare + " '" + value + "')"
					)
				);
				break;
			case "in" :
				queryBuilder[c.whereIn](this.column( columnName + "." + fieldQuery), this.processArrayType(value, this.properties[key]));
				break;
			case "nin" :
				queryBuilder[c.whereNotIn](this.column( columnName + "." + fieldQuery), this.processArrayType(value, this.properties[key]));
				break;
			case "endsWith" :
				queryBuilder[c.where](
					this.raw(
						this.tableName + "." + columnName + fieldQuery + " ilike '%" + value + "'"
					)
				);
				break;
			case "startsWith" :
				queryBuilder[c.where](
					this.raw(
						this.tableName + "." + columnName + fieldQuery + " ilike '" + value + "%'"
					)
				);
				break;
			case "contains" :
				queryBuilder[c.where](
					this.raw(
						this.tableName + "." + columnName + fieldQuery + " ilike '%" + value + "%'"
					)
				);
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					queryBuilder[c.where](
						this.raw(
							"(EXISTS(" +
							"SELECT " +
							"FROM jsonb_array_elements("+this.tableName+"." + columnName + ") " + columnName +  "1 " +
							"WHERE (" + columnName +  "1" + fieldQuery + ") NOT NULL " +
							") OR " +
							this.tableName + "." + columnName + fieldQuery + " NOT NULL)"
						)
					);
				} else {
					queryBuilder[c.where](
						this.raw(
							"(EXISTS(" +
							"SELECT " +
							"FROM jsonb_array_elements("+this.tableName+"." + columnName + ") " + columnName +  "1 " +
							"WHERE (" + columnName +  "1" + fieldQuery + ") != '" + value + "' " +
							") OR " +
							this.tableName + "." + columnName + fieldQuery + " != '" + value + "')"
						)
					);
				}
				break;
			case "or" :
			case "and" :

				isOr = compare === "or" ? true : false;

				queryBuilder.where(
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

							this.processCompare(innerKey, innerCompare, innerValue, builder, isOr);
						}
					}
				);
				break;
			case "=" :
			case "==" :
			default :

				if (value === null) {
					queryBuilder[c.where](
						this.raw(
							this.tableName + "." + columnName + fieldQuery + " ISNULL"
						)
					);
				} else {
					queryBuilder[c.where](
						this.raw(
							this.tableName + "." + columnName + fieldQuery + " = '" + value + "'"
						)
					);
				}
				break;
		}
	}


	/**
	 * Process a type[] column
	 * @param key
	 * @param compare
	 * @param value
	 * @param queryBuilder
	 */
	processArrayColumn(key, compare, value, queryBuilder, isOr) {

		let context = this;
		let property = this.properties[key];


		let columnName;
		if (property && property.columnName) {
			columnName = this.castColumn(this.tableName, property);
		} else {
			return;
		}

		//console.log(value);

		let processedValue = this.processType(value, property);
		//console.log(processedValue);

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
				queryBuilder[c.where](this.raw(columnName + " > " + processedValue));
				break;
			case "gte" :
			case ">=" :
				queryBuilder[c.where](this.raw(columnName + " >= " + processedValue));
				break;
			case "lt" :
			case "<" :
				queryBuilder[c.where](this.raw(columnName + " < " + processedValue));
				break;
			case "lte" :
			case "<=" :
				queryBuilder[c.where](this.raw(columnName + " <= " + processedValue));
				break;
			case "in" :
			case "rightInLeft" :
				queryBuilder[c.where](this.raw(columnName + " @> " + processedValue));
				break;
			case "nin" :
			case "rightNinLeft" :
				queryBuilder[c.whereNot](this.raw(columnName + " @> " + processedValue));
				break;
			case "leftInRight" :
				queryBuilder[c.where](this.raw(columnName + " <@ " + processedValue));
				break;

			case "leftNinRight" :
				queryBuilder[c.whereNot](this.raw(columnName + " <@ " + processedValue));
				break;
			case "=" :
			case "==" :
			case "eq" :
				if (processedValue === null) {
					queryBuilder[c.where](this.raw(columnName + " isnull" ));
				} else {
					queryBuilder[c.where](this.raw(columnName + " = " + processedValue));
				}
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (processedValue === null) {
					queryBuilder[c.where](this.raw(columnName + " is not null" ));
				} else {
					queryBuilder[c.whereNot](this.raw(columnName + " = " + processedValue));
				}
				break;
				break;
			case "or" :
				/**
				 * or : [
				 *  {field1: val1},
				 *  {field2 {">":val2}
			        * ]
				 */
				queryBuilder[compare === "or" ? "orWhere" : "where"](
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
				return this.processArrayColumn(key, "==", value, queryBuilder, isOr);
		}
	}


	castColumn(tableName, property) {
		switch (property.format) {
			case "integer" :
				return '"'+tableName+'"."' + property.columnName + '"::int[]';
			case "number" :
				return '"'+tableName+'"."' + property.columnName + '"::decimal[]';
			default :
				return '"'+tableName+'"."' + property.columnName + '"::text[]';
		}
	}


	processContains(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;

		return this.raw(this.tableName + "." + columnName + "::text ilike '%" + value + "%'")
	}

	processStartsWith(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;
		return this.raw(this.tableName + "." + columnName + "::text ilike '" + value + "%'")
	}

	processEndsWith(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;
		return this.raw(this.tableName + "." + columnName + "::text ilike '%" + value + "'")
	}

	buildSelect (key, subKey) {
		if (this.properties[key].type === "object" && subKey) {
			//this.postProcess = true;
			//return this.knexRaw(`"${this.tableName}"."${this.properties[key].columnName}"->>'${subKey}' as "${key + "." + subKey}"`);
			return this.knexRaw(`"${this.tableName}"."${this.properties[key].columnName}"->>'${subKey}' as "${subKey}"`);
		}
		return this.knexRaw(`"${this.tableName}"."${this.properties[key].columnName}" as "${key}"`);
	}

	/**
	 * Incoming values are pretty much all going to be strings, so let's parse that out to be come correct types
	 * @param value
	 * @param property
	 * @param isInsertOrUpdate
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
				if (!_.isArray(value)) {
					value = [value];
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
				if (!_.isArray(value)) {
					value = [value];
				}
				switch (property.format) {
					case "uuid" :
					case "string" :
						return this.raw("ARRAY['" + value.join("','") + "']::text[]");
						break;
					case "integer" :
						return this.raw("ARRAY['" + value.join("','") + "']::int[]");
						break;
					case "number" :
						return this.raw("ARRAY['" + value.join("','") + "']::decimal[]");
						break;
					default :
						return this.raw("ARRAY[" + value.join(",") + "]::text[]");

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
				if (value === null) {
					return null;
				}
				if (property.format) {
					switch (property.format) {
						case "date-time" :
						case "date" :
							try {
								if (moment(value).isValid()) {
									return value;
								}
							} catch (e) {

							}
							if (property.allowNull) {
								return null;
							}
							return '';
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
					return _.isString(value) ? value.trim() : value + "";
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
