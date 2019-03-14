const _ = require("lodash");
const moment = require("moment-timezone");
const uuid = require("node-uuid");
const inflector = require("../helper/inflector");
const knex = require("knex");

module.exports = class QueryToPgSql {

	constructor(schema) {
		this.schema = schema;
		//console.log("New Builder for " + this.tableName);
	}

	get properties() {
		return this.schema.properties;
	}

	get tableName() {
		return this.schema.tableName;
	}

	get primaryKey() {
		return this.schema.primaryKey;
	}

	/**
	 *
	 * @returns {string[]}
	 */
	get keywords() {
		return ['sort', 'select', 'skip', 'offset', 'limit', 'sort', 'join', 'count'];
	}

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
	 *
	 * @returns {Knex.Client}
	 */
	get qb() {

		if (this._queryBuilder) {
			return this._queryBuilder(this.tableName);
		}
		this._queryBuilder = knex(
			{
				client: this.client,
				/**
				 * convert camelCase to snake_case. Note: wrap command in knex.raw() if you don't want this to happen
				 * @param value
				 * @param origImpl
				 * @param queryContext
				 * @returns {*}
				 */
				wrapIdentifier: (value, origImpl, queryContext) => {
					if (value.indexOf("_") === -1) {
						//console.log(value + " => " + inflector.underscore(value));
						if (!process.env.IGNORE_CASE) {
							value = inflector.underscore(value);
						}

					}
					return origImpl(value);
				}
			}
		);
		return this._queryBuilder(this.tableName);
	}

	knexRaw(value) {
		return this.raw(value);
	}

	raw(value) {

		return knex(
			{
				client: this.client
			}
		).raw(value);
	}


	/**
	 * Generate SQL select statement
	 * @param query
	 * @returns {*}
	 */
	select(query) {

		query = _.clone(query);

		let queryBuilder = this.parseQuery(query);
		let selects = [];
		let context = this;

		if (query.select) {
			query.select = typeof query.select === "string" ? query.select.split(',') : query.select;

			for (let i = 0; i < query.select.length; i++) {
				let key = query.select[i];
				if (this.properties[key]) {
					selects.push(this.buildSelect(this.tableName,this.properties[key].columnName,key));
				} else if (key.indexOf('as') !== -1) {
					selects.push(key);
				}
			}
		}

		if (selects.length === 0 || !query.select) {
			for (let key in this.properties) {
				selects.push(this.buildSelect(this.tableName,this.properties[key].columnName,key));;
			}
		}

		delete query.select;

		selects.forEach(
			function(item) {
				//allow bypass of column names and assume the developer knows what they are doing
				queryBuilder.select(context.raw(item));
			}
		);

		for (let key in query) {

			if (query[key] === "") {
				continue;
			}

			query[key] = this.decodeQuery(query[key]);

			switch (key) {
				case "skip" :
				case "offset" :
					queryBuilder.offset(parseInt(query[key]));
					break;
				case "limit" :
					queryBuilder.limit(parseInt(query[key]));
					break;
				case "sort" :
					let params = query[key].split(" ");
					let direction = "ASC";
					if (this.properties[params[0]]) {
						if (params.length > 1) {
							if (params[1].toLowerCase() === "desc") {
								direction = "DESC";
							}
						}
						queryBuilder.orderBy(this.properties[params[0]].columnName, direction);
					}
					break;
				case "select" :
					break;
			}
		}

		//console.log(queryBuilder.toString());

		return queryBuilder;
	}

	buildSelect (tablename, columnName, key) {
		return this.knexRaw('"' + this.tableName + '"."' + this.properties[key].columnName + '" as "' + key + '"');
	}

	/**
	 * @param key
	 * @param query
	 * @returns {*}
	 */
	count(query) {
		query = _.clone(query);
		let queryBuilder = this.parseQuery(query);
		return queryBuilder.count(this.raw(this.properties[this.primaryKey].columnName));
	}

	/**
	 * General sqlBuilder update statement
	 * @param {Object} query
	 * @param {Object} data - the data to insert
	 * @returns {*}
	 */

	//this.this.tableName, query, data, this.properties
	update(query, data) {

		query = _.clone(query);

		let queryBuilder = this.parseQuery(query);
		let transform = {};

		//TODO should data have been validated before this? Seems like it
		for (var key in data) {
			if (this.properties[key]) {
				transform[this.properties[key].columnName] = this.processType(data[key], this.properties[key], true);
			}
		}

		queryBuilder.update(transform);
		return queryBuilder;
	}

	//this.tableName, query, data, this.properties
	delete(query) {

		query = _.clone(query);

		let queryBuilder = this.parseQuery(query);
		queryBuilder.delete();
		return queryBuilder;
	}

	/**
	 *
	 * @param table
	 * @param primaryKey
	 * @param data
	 * @param schema
	 * @returns {*}
	 */
	insert(data) {
		let queryBuilder = this.qb;
		let translation = {};
		let required = _.clone(this.schema.required);

		if (this.primaryKey) {
			if (!data[this.primaryKey]) {
				if (this.properties[this.primaryKey].type === "string" && this.properties[this.primaryKey].format === "uuid") {
					data[this.primaryKey] = uuid.v4();
				}
			}
		}

		//TODO should data have been validated before this? Seems like it
		for (let key in data) {
			if (this.properties[key]) {
				//does final json conversion as needed
				translation[this.properties[key].columnName] = this.processType(data[key], this.properties[key], true);
			}
			let index = _.indexOf(required, key);
			if (index !== -1) {
				required.splice(index, 1);
			}
		}

		if (required.length > 0) {
			//console.log(data);
			return {
				error : required,
				message : "Missing or Invalid Fields"
			}
		}

		queryBuilder.insert(translation);

		return queryBuilder;
	}

	/**
	 * A query to sqlBuilder conversion manager
	 * @param {Object} query
	 * @returns {*}
	 */
	parseQuery(query) {
		//TODO support complex or conditions

		let queryBuilder;

		queryBuilder = this.qb;

		if (!query) {
			return queryBuilder;
		}

		let queryParams;

		if (query.where) {
			queryParams = _.isString(query.where) ? JSON.parse(query.where) : query.where;
		} else {
			queryParams = query;
		}

		for (let key in queryParams) {
			if (_.indexOf(this.keywords, key) !== -1) {
				//console.log("parseQuery => keyword error " + key);
				continue;
			}

			let compare = "";
			let value;

			if (query[key] === "") {
				continue;
			}

			if (typeof queryParams[key] === "object") {
				if (key === "and" || key === "or") {
					compare = key;
					//console.log(JSON.stringify(queryParams[key]))
				} else {
					compare = Object.keys(queryParams[key])[0]; //TODO what is this?
				}

			}

			if (compare !== "" && compare !== "or" && compare !== "and") {
				value = queryParams[key][compare];
			} else {
				value = queryParams[key];
			}

			this.processCompare(key, compare, value, queryBuilder);

		}


		return queryBuilder;
	}

	/**
	 *
	 * @param {string} key - the field key
	 * @param {string} compare - the comparitor, gt, >, < lt, !, != etc
	 * @param {varies} value - the string, array, number, etc
	 * @param {Object} queryBuilder - the current knex queryBuilder
	 */
	processCompare(key, compare, value, queryBuilder, isOr) {

		let columnName;
		let columnFormat = null;

		if (key.indexOf(".") !== -1 || _.isObject(key)) { //JSONB Syntax
			return this.processObjectColumn(this.tableName, key, compare, value, queryBuilder)
		}

		if (this.properties[key] && this.properties[key].columnName) {
			columnName = this.properties[key].columnName;
			let columnType = this.properties[key].type;
			columnFormat = this.properties[key].format;
			if (columnType === "array") {
				return this.processArrayColumn(key, compare, value, queryBuilder)
			}
		} else if (key !== "or" && key !== "and") {
			return;
		}

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
				queryBuilder[c.where](this.tableName + "." + columnName, ">", this.processType(value, this.properties[key]));
				break;
			case "gte" :
			case ">=" :
				queryBuilder[c.where](this.tableName + "." + columnName, ">=", this.processType(value, this.properties[key]));
				break;
			case "lt" :
			case "<" :
				queryBuilder[c.where](this.tableName + "." + columnName, "<", this.processType(value, this.properties[key]));
				break;
			case "lte" :
			case "<=" :
				queryBuilder[c.where](this.tableName + "." + columnName, "<=", this.processType(value, this.properties[key]));
				break;
			case "in" :
				queryBuilder[c.whereIn](this.tableName + "." + columnName, this.processArrayType(value, this.properties[key]));
				break;
			case "nin" :
				queryBuilder[c.whereNotIn](this.tableName + "." + columnName, this.processArrayType(value, this.properties[key]));
				break;
			case "endsWith" :
				if (columnFormat === "uuid") {
					queryBuilder[c.where](this.raw(this.tableName + "." + columnName + "::text"), this.like, "%" + value); //todo postgres only
				} else {
					queryBuilder[c.where](this.tableName + "." + columnName, this.like, "%" + value); //todo postgres only
				}
				break;
			case "startsWith" :
				if (columnFormat === "uuid") {
					queryBuilder[c.where](this.raw(this.tableName + "." + columnName + "::text"), this.like, value + "%"); //todo postgres only
				} else {
					queryBuilder[c.where](this.tableName + "." + columnName, this.like, value + "%"); //todo postgres only
				}

				break;
			case "contains" :

				if (columnFormat === "uuid") {
					queryBuilder[c.where](this.raw(this.tableName + "." + columnName + "::text"), this.like, "%" + value + "%"); //todo postgres only
				} else {
					queryBuilder[c.where](this.tableName + "." + columnName, this.like, "%" + value + "%"); //todo postgres only
				}
				break;
			case "=" :
			case "==" :
			case "eq" :
				if (value === null) {
					queryBuilder[c.whereNull](this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					queryBuilder[c.whereIn](this.tableName + "." + columnName, this.processArrayType(value, this.properties[key]));
				} else {
					queryBuilder[c.where](this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				}

				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					queryBuilder[c.whereNotNull](this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					queryBuilder[c.whereNotIn](this.tableName + "." + columnName, this.processArrayType(value, this.properties[key]));
				} else {
					queryBuilder[c.whereNot](this.tableName + "." + columnName, this.processType(value, this.properties[key]));
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

				let isOr = compare === "or" ? true : false;


				queryBuilder.where(
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

							//compare, columnName, key, value, properties, queryBuilder
							//console.log("compare => " + innerKey + " " + innerCompare + " " + JSON.stringify(innerValue));
							//table, key, compare, value, properties, queryBuilder
							this.processCompare(innerKey, innerCompare, innerValue, builder, isOr);
						}
					}
				);
				break;
			default :
				if (value === null) {
					queryBuilder[c.whereNull](this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					queryBuilder[c.whereIn](this.tableName + "." + columnName, this.processArrayType(value, this.properties[key]));
				} else {
					queryBuilder[c.where](this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				}
		}
	}

	/**
	 * Process a text[] int[] real[] column
	 * @param key
	 * @param compare
	 * @param value
	 * @param queryBuilder
	 */
	processObjectColumn(key, compare, value, queryBuilder) {

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
					queryBuilder.select(this.raw(this.tableName + "." + columnName + " as \"" + as + "\""));
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
				queryBuilder.where(this.raw(this.tableName + "." + columnName), ">", this.processType(value, this.properties[key]));
				break;
			case "gte" :
			case ">=" :
				queryBuilder.where(this.raw(this.tableName + "." + columnName), ">=", this.processType(value, this.properties[key]));
				break;
			case "lt" :
			case "<" :
				queryBuilder.where(this.raw(this.tableName + "." + columnName), "<", this.processType(value, this.properties[key]));
				break;
			case "lte" :
			case "<=" :
				queryBuilder.where(this.raw(this.tableName + "." + columnName), "<=", this.processType(value, this.properties[key]));
				break;
			case "in" :
				queryBuilder.whereIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				break;
			case "nin" :
				queryBuilder.whereNotIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				break;
			case "endsWith" :
				queryBuilder.where(this.raw(this.tableName + "." + columnName), this.like, "%" + value); //todo postgres only
				break;
			case "startsWith" :
				queryBuilder.where(this.raw(this.tableName + "." + columnName), this.like, value + "%"); //todo postgres only
				break;
			case "contains" :
				queryBuilder.where(this.raw(this.tableName + "." + columnName), this.like, "%" + value + "%"); //todo postgres only
				break;
			case "=" :
			case "==" :
			case "eq" :
				if (value === null) {
					queryBuilder.whereNull(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					queryBuilder.whereIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				} else {
					queryBuilder.where(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				}

				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					queryBuilder.whereNotNull(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					queryBuilder.whereNotIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				} else {
					queryBuilder.whereNot(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
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
				queryBuilder[compare === "or" ? "orWhere" : "where"](
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

							//compare, columnName, key, value, properties, queryBuilder
							//console.log("compare => " + innerKey + " " + innerCompare + " " + JSON.stringify(innerValue));
							//table, key, compare, value, properties, queryBuilder
							this.processCompare(innerKey, innerCompare, innerValue, builder);
						}
					}
				);
				break;
			default :
				if (value === null) {
					queryBuilder.whereNull(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					queryBuilder.whereIn(this.raw(this.tableName + "." + columnName), this.processArrayType(value, this.properties[key]));
				} else {
					queryBuilder.where(this.raw(this.tableName + "." + columnName), this.processType(value, this.properties[key]));
				}
		}
	}


	/**
	 * Process a JSONB Column
	 * @param key
	 * @param compare
	 * @param value
	 * @param queryBuilder
	 */
	processArrayColumn(key, compare, value, queryBuilder) {

		let context = this;

		let columnName;
		if (this.properties[key] && this.properties[key].columnName) {
			columnName = this.properties[key].columnName;
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
				queryBuilder.where(this.raw(this.processType(val, this.properties[key]) + " > ANY(" + columnName + ")"));
				break;
			case "gte" :
			case ">=" :
				queryBuilder.where(this.raw(this.processType(val, this.properties[key]) + " >= ANY(" + columnName + ")"));
				break;
			case "lt" :
			case "<" :
				queryBuilder.where(this.raw(this.processType(val, this.properties[key]) + " < ANY(" + columnName + ")"));
				break;
			case "lte" :
			case "<=" :
				queryBuilder.where(this.raw(this.processType(val, this.properties[key]) + " <= ANY(" + columnName + ")"));
				break;
			case "in" :
				queryBuilder.where(
					(builder) => {
						value.forEach(
							function (val) {
								builder.orWhere(context.knexRaw(context.processType(val, this.properties[key]) + " = ANY(" + columnName + ")"));
							}
						)
					}
				)

				break;
			case "nin" :
				queryBuilder.where(
					(builder) => {
						value.forEach(
							function (val) {
								builder.where(context.knexRaw(context.processType(val, this.properties[key]) + " != ANY(" + columnName + ")"));
							}
						)
					}
				)
				break;
			case "=" :
			case "==" :
			case "eq" :
				if (_.isArray(value)) {
					queryBuilder.where(
						(builder) => {
							value.forEach(
								function (val) {
									builder.orWhere(context.knexRaw(context.processType(val, this.properties[key]) + " = ANY(" + columnName + ")"));
								}
							)
						}
					)
				} else {
					queryBuilder.where(this.raw(this.processType(value, this.properties[key]) + " = ANY(" + columnName + ")"));
				}
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (_.isArray(value)) {
					queryBuilder.where(
						(builder) => {
							value.forEach(
								function (val) {
									builder.where(context.knexRaw(context.processType(val, this.properties[key]) + " != ANY(" + columnName + ")"));
								}
							)
						}
					)
				} else {
					queryBuilder.where(this.raw(this.processType(value, this.properties[key]) + " = ANY(" + columnName + ")"));
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

							//compare, columnName, key, value, properties, queryBuilder
							//console.log("compare => " + innerKey + " " + innerCompare + " " + JSON.stringify(innerValue));
							//this.tableName, key, compare, value, properties, queryBuilder
							this.processCompare(innerKey, innerCompare, innerValue, builder);
						}
					}
				);
				break;
			default :
				if (value === null) {
					queryBuilder.whereNull(this.tableName + "." + columnName, this.processType(value, this.properties[key]));
				} else if (_.isArray(value)) {
					value.forEach(
						function (val) {
							queryBuilder.orWhere(context.knexRaw(context.processType(val, this.properties[key]) + " != ANY(" + columnName + ")"));
						}
					)
				} else {
					queryBuilder.where(this.raw(this.processType(value, this.properties[key]) + " = ANY(" + columnName + ")"));
				}
		}
	}

	/**
	 * decode funny query string values
	 * @param query
	 * @returns {string}
	 */
	decodeQuery(query) {
		return decodeURI(query).split("/").join("\/");
	}

	/**
	 * Incoming values are pretty much all going to be strings, so let's parse that out to be come correct types
	 * @param value
	 * @param {Object} property - a single json schema property
	 * @returns {*}
	 */
	processType(value, property) {
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
