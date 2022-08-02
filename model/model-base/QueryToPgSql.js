const QueryBase = require("./QueryToSqlBase");
const _ = require("lodash");
const moment = require("moment-timezone");
const knex = require("knex");
const sqlString = require("sqlstring");

class QueryToPgSql extends QueryBase{


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
		let columnFullName;
		let fieldQuery = "";
		let as = "";
		let exists = "";

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
					columnFullName = `"${this.tableName}"."${columnName}"`;
					exists = `${columnFullName}::jsonb`;
					parts.shift();
					for (let i = 0; i < parts.length; i++) {
						if (i + 1 === parts.length) {
							fieldQuery += "->>'" + parts[i] + "'";
							exists += ` \\? '${parts[i]}'`;
						} else {
							fieldQuery += "->'" + parts[i] + "'";
							exists += ` -> '${parts[i]}'`;
						}
						as += "." + parts[i];
					}
				} else {
					console.log("no object column named " + key);
					return;
				}
			} else {
				return;
			}
		}

		let cast = "";
		let safeValue = value;
		if (typeof value === "string") {
			cast = "::text";
			safeValue = sqlString.escape(value);
		} else if (typeof value === "boolean") {
			cast = "::bool";
		} else if (typeof value === "number") {
			cast = "::numeric"
		} else if (value instanceof Array) {
			if (value.length > 0) {
				switch (typeof value[0]) {
					case "string" :
						cast = "::text";
						break;
					case "boolean" :
						cast = "::boolean";
						break;
					case "number" :
						cast = "::numeric";
						break;
				}
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
			case ">" :
			case ">=" :
			case "<" :
			case "<=" :
				queryBuilder[c.where](
					this.raw(
						`(${exists} AND
						(${columnFullName}${fieldQuery})${cast} ${compare} ${safeValue})`
					)
				);
				break;
			case "in" :
				queryBuilder[c.whereIn](this.raw(`(${columnFullName}${fieldQuery})${cast}`),
					this.processArrayType(value, this.properties[key]));
				break;
			case "nin" :
			case "notIn" :
				queryBuilder[c.whereNotIn](this.raw(`(${columnFullName}${fieldQuery})${cast}`),
					this.processArrayType(value, this.properties[key]));
				break;
			case "endsWith" :
			case "startsWith" :
			case "contains" :
				switch (compare) {
					case "endsWith" :
						safeValue = sqlString.escape("%" + value);
						break;
					case "startsWith" :
						safeValue = sqlString.escape(value + "%");
						break;
					case "contains" :
						safeValue = sqlString.escape("%" + value + "%");
						break;
				}
				queryBuilder[c.where](
					this.raw(
						`(${exists} AND
						${columnFullName}${fieldQuery} ilike ${safeValue})`
					)
				);
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					queryBuilder[c.where](
						this.raw(
							`(${exists} AND
							(${columnFullName}${fieldQuery})${cast} NOT NULL)`
						)
					);
				} else {
					queryBuilder[c.where](
						this.raw(
							`(
								${exists} AND 
								(${columnFullName}${fieldQuery})${cast} != ${safeValue}
							)`
						)
					);
				}
				break;
			case "or" :
			case "and" :

				isOr = compare === "or";

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
			default : // {key : value}

				if (value === null) {
					queryBuilder[c.where](
						this.raw(
							`(${exists} AND ${columnFullName}${fieldQuery} ISNULL)`
						)
					);
				} else {
					queryBuilder[c.where](
						this.raw(
							`(${exists} AND ${columnFullName}${fieldQuery} = ${safeValue})`
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
			case "any" :
				//Intersection length > 0
				queryBuilder[c.where](this.raw(columnName + " && " + processedValue));
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
		return this.raw(`${this.tableName}.${columnName}::text ilike ${sqlString.escape("%" + value + "%")}`)
	}

	processStartsWith(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;
		return this.raw(`${this.tableName}.${columnName}::text ilike ${sqlString.escape(value + "%")}`)
	}

	processEndsWith(key, value) {
		let columnName = this.properties[key].columnName;
		let columnType = this.properties[key].type;
		let columnFormat = this.properties[key].format;
		return this.raw(`${this.tableName}.${columnName}::text ilike ${sqlString.escape("%" + value)}`)
	}

	buildSelect (key, subKey) {
		//console.log("key => " + key + " -- subKey => " + subKey);
		if (this.properties[key].type === "object" && subKey) {
			let count = 0;
			let as = `${key}.${subKey.map((val)=>{return val}).join(".")}`;
			let from = `${subKey.map((val)=>{
				count++;
				if (count < subKey.length) {
					return "->'" + val + "'";
				} else {
					return "->>'" + val + "'";
				}
			}).join("")}`;
			let select = `to_json("${this.tableName}"."${this.properties[key].columnName}"${from}) as "${as}"`;
			return this.knexRaw(select);
		}
		return this.knexRaw(`"${this.tableName}"."${this.properties[key].columnName}" as "${key}"`);
	}

	/**
	 * For PG we want to allow sorting by the attributes in the JSONB column.
	 * @param propertyName
	 * @param direction
	 * @returns {null|*}
	 */
	buildSort(propertyName, direction) {
		let columnFullName;
		if (propertyName.indexOf(".") !== -1) {
			//TODO this is postgres, move to postgres
			let parts = propertyName.split(".");
			if (this.properties[parts[0]]) {
				columnFullName = `"${this.tableName}"."${this.properties[parts[0]].columnName}"`;
				for (let i = 1; i < parts.length; i++) {
					columnFullName += `->>'${parts[i]}'`;
				}
			}
		} else if (this.properties[propertyName]) {
			columnFullName = `"${this.tableName}"."${this.properties[propertyName].columnName}"`;
		}
		if (columnFullName) {
			return this.raw(columnFullName);
		}
		return null;
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
				if (!Array.isArray(value)) {
					value = [value];
				}
				if (value.length === 0) {
					return null;
				}
				if (isInsertOrUpdate) {
					switch (property.format) {
						case "string" :
							return this.raw("ARRAY[" + this.sqlFormatArray(value, "string") + "]");
							break;
						case "uuid" :
							return this.raw("ARRAY[" + this.sqlFormatArray(value, "string") + "]::uuid[]");
							break;
						case "integer" :
							return this.raw("ARRAY[" + this.sqlFormatArray(value, "integer") + "]");
						case "number" :
							return this.raw("ARRAY[" + this.sqlFormatArray(value, "number") + "]");

					}
				}
				if (!Array.isArray(value)) {
					value = [value];
				}
				switch (property.format) {
					case "uuid" :
					case "string" :
						return this.raw("ARRAY[" + this.sqlFormatArray(value, "string") + "]::text[]");
						break;
					case "integer" :
						return this.raw("ARRAY[" + this.sqlFormatArray(value, "integer") + "]::int[]");
						break;
					case "number" :
						return this.raw("ARRAY[" + this.sqlFormatArray(value, "number") + "]::decimal[]");
						break;
					default :
						return this.raw("ARRAY[" + this.sqlFormatArray(value, "string") + "]::text[]");

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
					return value === true;
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
		if (!Array.isArray(list)) {
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

module.exports = QueryToPgSql;
