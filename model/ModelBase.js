
let moment = require("moment-timezone");
let now = require("../helper/now");
let uuid = require("node-uuid");
let _ = require("lodash");
let pool;
let sqlBuilder;
let db;

if (process.env.DEFAULT_DB.indexOf("postgres") === 0) {
	sqlBuilder = require("../helper/query-to-sql");
	pool = require("../helper/postgres-pool");
	db = "pg";
} else if (process.env.DEFAULT_DB.indexOf("mysql") === 0) {
	sqlBuilder = require("../helper/query-to-mysql");
	pool = require("../helper/mysql-pool");
	db = "mysql"
}

module.exports = class ModelBase {

	/**
	 *
	 * @param schema - json schema for this model
	 * @param primaryKey - optional primary key, defaults to id
	 * @param req - the express request (or other object). looking for the request context really. req.role = "api-user"
	 * or req.account.id etc.
	 */
	constructor(schema, validation, fields, req) {
		this.schema = schema;
		this.tableName = schema.tableName;
		this.properties = schema.properties;
		this.primaryKey = schema.primaryKey;
		this.validation = validation;
		this.fields = fields;

		if (req) {
			this.req = req;
		}
	}

	/**
	 *
	 * @returns {Pool}
	 */
	getPool() {
		return pool;
	}

	/**
	 * create a new record
	 * @param data
	 * @returns {Promise<*>}
	 */
	async create(data) {

		this.checkPrimaryKey(data);

		if (this.properties.createdAt) {
			data.createdAt = now();
		}

		let params = this.convertDataTypes(data);
		let missing = this.checkRequiredProperties(params);
		if (missing.length > 0) {
			throw new Error({message: "Missing => " + missing.join(", ")});
		}

		let command = sqlBuilder.insert(
			this.tableName,
			this.primaryKey,
			params,
			this.schema
		);

		try {
			let result = await this.execute(command);
			return {
				id: params.id
			}
		} catch (e) {
			//console.log(e);
			return e;
		}
	}

	/**
	 *
	 * @param id
	 * @param query - used to pass in select & join
	 * @returns {Promise<*>}
	 */
	async read(id, query) {
		let obj = {
			where: {}
		}

		obj.where[this.primaryKey] = id;
		if (query && query.select) {
			obj.select = query.select;
		}

		let command = sqlBuilder.select(this.tableName, obj, this.properties);

		var result = await this.execute(command);

		if (result.length === 1) {
			if (query && query.join) {
				return await this.join(result[0], query);
			}
			return result[0];

		} else {
			console.error("Ambiguous find one " + id);
			return null;
		}
	}

	/**
	 * Update one record
	 * @param id
	 * @param data
	 * @param query
	 * @returns {Promise<void>}
	 */
	async update(id, data) {

		var exists = await this.exists(id);

		if (exists) {
			data.updatedAt = now();

			let params = this.convertDataTypes(data);
			let missing = this.checkRequiredProperties(params);

			if (missing.length > 0) {
				throw new Error({message: "Missing => " + missing.join(", ")});
			}

			let query = {};
			query[this.primaryKey] = id;

			if (data[this.primaryKey]) {
				delete data[this.primaryKey]; //you can't change primary Keys. Don't even try!!!
			}

			let command = sqlBuilder.update(this.tableName, query, data, this.properties);

			try {
				let result = await this.execute(command);
				return result;
			} catch (e) {
				console.log(e);
				return null;
			}
		} else {
			throw new Error("Does not exist");
		}
	}

	async updateWhere(query, data) {
		let params = this.convertDataTypes(data);
		let missing = this.checkRequiredProperties(params);
		if (missing.length > 0) {
			throw new Error({message: "Missing => " + missing.join(", ")});
		}

		let command = sqlBuilder.update(this.tableName, query, params, this.properties);

		try {
			let result = await this.execute(command);
			return result;
		} catch (e) {
			return e;
		}
	}

	/**
	 * search for one or more records
	 * @param query
	 * @returns {Promise<*>}
	 */
	async query(query) {

		let command = sqlBuilder.select(this.tableName, query, this.properties);

		try {
			let result = await this.execute(command);
			if (query.join) {
				return await this.join(result, query);
			} else {
				return result;
			}
		} catch (e) {
			console.log(query);
			console.log(e);
			return [];
		}
	}

	async count(query) {
		let command = sqlBuilder.count(this.tableName, this.primaryKey, query, this.properties);
		let results = await this.execute(command);
		if (db === "pg" && results[0].count) {
			return results[0].count;
		} else {
			console.log(results);
			let key = Object.keys(results[0]);
			console.log("COUNT => " + results[0][key])
			return results[0][key];
		}

	}

	/**
	 * Psuedo for query
	 * @param query
	 * @returns {Promise<*>}
	 */
	async find(query) {
		return await this.query(query);
	}

	/**
	 * Query to find one record
	 * @param query
	 * @returns {Promise<*>}
	 */
	async findOne(query) {
		query.limit = 1;
		let result = await this.query(query);

		if (result && result.length > 0) {
			return result[0];
		}
		return null;
	}

	/**
	 * destroy one record
	 * @param id
	 * @returns {Promise<*>}
	 */
	async destroy(id) {
		let command = sqlBuilder.delete(
			this.tableName,
			{
				where : {
					[this.primaryKey] : id
				}
			}
		);

		var result = await this.execute(command);
		return result;
	}

	/**
	 * get an index of records by an optional key value pair
	 * @param key
	 * @param value
	 * @returns {Promise<*>}
	 */
	async index(query) {
		if (query.select && _.isString(query.select)) {
			query.select = query.select.split(",");
		}

		if (query.select) {
			let temp = [];
			for (var props in query.select) {
				if (this.properties[props]) {
					temp.push(props)
				}
			}
			query.select = temp;
		}

		delete query.where;

		if (!query.select || query.select.length === 0) {
			query.select = ['id', 'updatedAt'];
		}


		return await this.query(query);
	}

	/**
	 * Does a record with the id exist
	 * @param id
	 * @returns {Promise<boolean>}
	 */
	async exists(id) {
		let command = sqlBuilder.select(
			this.tableName,
			{
				where : {
					[this.primaryKey] : id,
				},
				select : [this.primaryKey],
				limit : 1
			},
			this.properties
		)
		this.lastCommand = command;

		console.log(this.lastCommand.toString());

		var result = await this.execute(command);
		if (result.length === 1) {
			return true
		}
		return false;
	}

	/**
	 * Shorthand method for updating one column in a row
	 * @param id
	 * @param key
	 * @param value
	 * @returns {Promise<*>}
	 */
	async setKey(id, key, value) {
		let obj = {}
		obj[key] = value;

		if (!await this.exists(id)) {
			return null;
		}

		let command = sqlBuilder.update(
			this.tableName,
			{
				where : {
					[this.primaryKey] : id
				}
			},
			{
				[key] : value
			},
			this.properties
		);

		try {
			var result = await this.execute(command);
			return result;
		} catch (e) {
			console.log(e);
			return null;
		}
	}

	/**
	 * Get the value of a single column from a single row
	 * @param id
	 * @param key
	 * @returns {Promise<*>}
	 */
	async getKey(id, key) {
		let command = sqlBuilder.select(
			this.tableName,
			{
				where : {
					[this.primaryKey] : id
				},
				select : [key]
			}
		);

		try {
			var result = await this.execute(command);
			return result;
		} catch (e) {
			console.log(e);
			return null;
		}
	}

	/**
	 * If the primary key is a UUID and missing, create one
	 * @param data
	 * @returns {Promise<void>}
	 */
	checkPrimaryKey(data) {
		if (!data[this.primaryKey]) {
			switch (this.properties[this.primaryKey].type) {
				case "string" :
					switch (this.properties[this.primaryKey].format) {
						case "uuid" :
							data[this.primaryKey] = uuid.v4();
					}
			}

		}
	}

	/**
	 *
	 * @param results
	 * @param query
	 * @returns {Promise<void>}
	 */
	async join(results, query) {

		if (!this.relationMappings) {
			return results;
		}

		let relations = this.relationMappings;
		let fromIndex = {};
		let findOne = false;

		if (!_.isArray(results)) {
			results = [results];
			findOne = true;
		}

		if (query.join === "*") {
			query.join = Object.keys(relations);
		}


		let join = _.clone(query.join);


		if (_.isString(join)) {
			//console.log("condition 1");
			let items = join.split(",");
			join = {};
			items.forEach(
				function (item) {
					join[item] = {
						where: {}
					};
				}
			)
		} else if (_.isArray(join)) {
			//console.log("condition 2");
			let temp = {};
			join.forEach(
				function (item) {
					temp[item] = {
						where: {}
					}
				}
			);
			join = temp;
		} else if (_.isObject(join)) {
			//not sure is there is anything to do here
			//console.log("Condition 3");
		}

		for (let key in join) {

			if (relations[key]) {

				//To stop infinite recursion, a relationship may only be requested once.
				if (_.isString(query.join)) {
					let parts = query.join.split(',');
					let index = _.indexOf(parts, key);
					parts.splice(index, 1);
					query.join = parts.join(",");
				} else if (_.isArray(query.join)) {
					let index = _.indexOf(query.join, key);
					query.join.splice(index, 1);
				} else {
					delete query.join[key];
				}

				let list;
				let m;
				let throughList;
				let item = relations[key];
				let joinFrom = item.join.from;
				let joinTo = item.join.to;
				let joinThroughFrom = item.join.through ? item.join.through.from : null;
				let joinThroughTo = item.join.through ? item.join.through.to : null;
				let targetKeys = [];
				let deepJoin;

				for (let i = 0; i < results.length; i++) {
					if (results[i][joinFrom]) {
						targetKeys.push(results[i][joinFrom]);
						fromIndex[results[i][joinFrom]] = i;
					}
				}

				if (item.throughClass) { //build new targetKey based on the pivot table
					m = new item.throughClass(this.req);
					let j = _.clone(join[key]);
					j.where = {};
					j.where[joinThroughFrom] = {in: targetKeys};
					j.join = query.join;
					j.select = [joinThroughFrom, joinThroughTo];
					throughList = await m.find(j);
					targetKeys = _.uniq(_.map(throughList, joinThroughTo));
				}

				switch (item.relation) {
					case "HasOne":
						m = new item.modelClass(this.req);
						join[key].where[joinTo] = {in: targetKeys};
						join[key].join = query.join;
						list = await m.find(join[key]);

						if (item.throughClass) {
							list.forEach(
								function (row) {
									console.log(row);
									var obj = {};
									obj[joinThroughTo] = row[joinTo];
									let throughItem = _.find(throughList, obj);
									let resultsIndex = fromIndex[throughItem[joinThroughFrom]];
									results[resultsIndex][key] = row;
								}
							)
						} else {
							for (let i = 0; i < list.length; i++) {
								results[fromIndex[list[i][joinTo]]][key] = list[i];
							}
						}

						break;
					case "HasMany" :
						m = new item.modelClass(this.req);
						join[key].where[joinTo] = {in: targetKeys};
						join[key].join = query.join;
						list = await m.find(join[key]);

						if (item.throughClass) {
							list.forEach(
								function (row) {
									var obj = {};
									obj[joinThroughTo] = row[joinTo];
									let throughItem = _.find(throughList, obj);
									let resultsIndex = fromIndex[throughItem[joinThroughFrom]];
									results[resultsIndex][key] = results[resultsIndex][key] || [];
									results[resultsIndex][key].push(row);
								}
							)
						} else {
							for (let i = 0; i < list.length; i++) {
								if (!results[fromIndex[list[i][joinTo]]][key]) {
									results[fromIndex[list[i][joinTo]]][key] = [];
								}
								results[fromIndex[list[i][joinTo]]][key].push(list[i]);
							}
						}

						break;
				}

			}
		}

		if (findOne) {
			return results[0];
		}

		return results;
	}

	/**
	 * Converts any input types to the correct one (eg. string to int) and convert objects to JSON
	 * @param data
	 * @returns {Promise<void>}
	 */
	convertDataTypes(data) {
		let params = {};
		for (var key in data) {
			if (this.properties[key]) {
				params[key] = sqlBuilder.processType(data[key], this.properties[key]);
			}
		}
		return params;
	}

	/**
	 *
	 * @param data
	 * @param action
	 * @returns {Promise<*>}
	 */
	async checkRequiredProperties(data, action) {
		let params = {};
		let keys = [];

		for (var key in data) {
			params[key] = data[key];
			if (data[key] !== null) {
				keys.push(key);
			}
		}

		let intersection = _.intersection(this.schema.required, keys); //keys found in input and required

		if (intersection.length < this.schema.required.length) {  //if the intersection is less than required, something is missing
			//these will be the values that are missing.
			let missing = _.difference(intersection, this.schema.required);
			return missing;
		}

		return true;
	}

	convertToColumnNames(data) {
		let params = {};

		for (var key in data) {
			if (this.properties[key]) {
				params[this.properties[key].columnName] = data[key];
			}
		}

		return params;
	}

	async beforeCreate(id, data) {
		for(let key in data) {
			if (this.fields[key](data[key], data) === false) {

			}
		}
	}

	async afterCreate(id, data) {

	}

	async beforeUpdate(id, data) {

	}

	async afterUpdate(id, data) {

	}

	async afterDestroy(id) {

	}

	async execute(command, postProcess) {
		let sql = command.toString();
		this.lastCommand = command;

		console.log(sql.toString());

		if (sql.toLowerCase().indexOf("select") === 0) {
			try {
				let results = await this.getPool().query(sql);
				if (postProcess) {
					if (results.rows) {
						return this.postProcessResponse(results.rows);
					} else {
						return this.postProcessResponse(results);
					}
				} else {
					if (results.rows) {
						return results.rows;
					} else {
						return results;
					}
				}

				//return results.rows;
			} catch (e) {
				this.lastError = e;
				console.log(e);
				return false;
			}
		} else {
			try {
				let results = await this.getPool().query(sql);
				if (results.rows) {
					return results;
				} else {
					return {
						rows : results
					};
				}
			} catch (e) {
				this.lastError = e;
				console.log(e);
				console.log(sql.toString());
				return false;
			}
		}
	}

	postProcessResponse(result) {
		// TODO: add special case for raw results (depends on dialect)
		if (_.isArray(result)) {
			result.forEach(
				function (row) {
					for (let key in row) {
						if (key.indexOf("_") !== -1) {
							row[inflector.camelize(key, false)] = row[key];
							delete row[key];
						}
					}
				}
			)
		} else {
			for (let key in result) {
				if (key.indexOf("_") !== -1) {
					result[inflector.camelize(key, false)] = result[key];
					delete result[key];
				}
			}
		}
		return result;
	}

	/**
	 * Takes database result and converts it back to schema properties
	 * Use this when doing manual sql statements
	 * @param results
	 */
	convertResultsToSchema(results) {
		for (let i = 0; i < results.length; i++) {
			for (let key in results[i]) {
				for (let innerKey in this.properties) {
					if (this.properties[innerKey].column_name === key) {
						results[i][innerKey] = results[i][key];
						delete results[i][key];
					}
				}
			}
		}
	}

	/**
	 * Simple utility for creating a select prop_name as propName
	 * @param property
	 * @returns {string}
	 */
	selectAs(property) {
		return this.property[property].columnName + " as " + property;
	}


}