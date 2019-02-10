let moment = require("moment-timezone");
let now = require("../helper/now");
let uuid = require("node-uuid");
let _ = require("lodash");
let inflector = require("inflected");
let processType = require("../helper/process-type");
let validateAgainstSchema = require("../helper/validate-against-schema");
let md5 = require("md5");

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

	get connectionString() {
		let dataSource = this.dataSource || this.schema.dataSource;
		for (let key in process.env) {
			if (_.isString(process.env[key])) {
				if (process.env[key].indexOf(dataSource) !== -1) {
					return process.env[key];
				}
			}
		}
		return process.env.DEFAULT_DB;
	}

	/**
	 *
	 * @returns {Pool}
	 */
	get pool() {

		if (this.connectionString.indexOf("postgres") === 0) {
			this.db = "pg";
			return require("../helper/postgres-pool")(this.connectionString);
		} else if (this.connectionString.indexOf("mysql") === 0) {
			this.db = "mysql"
			return require("../helper/mysql-pool")(this.connectionString);
		}
	}

	/**
	 * Create a query builder in the DB flavor of choice
	 * @returns {module.QueryToSql|*}
	 */
	get queryBuilder() {
		if (global.schemaCache) {
			let name = md5(this.connectionString);
			if (global.schemaCache[this.schema.title]) {
				this.schema = global.schemaCache[this.schema.title];
				this.properties = this.schema.properties;
				this.primaryKey = this.schema.primaryKey;
			}
		}

		if (this.connectionString.indexOf("postgres") === 0) {
			return require("../helper/query-to-sql")
		} else if (this.connectionString.indexOf("mysql") === 0) {
			return require("../helper/query-to-mysql")
		}
		//TODO MSSQL, ElasticSearch, Mongo, Redis
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

		let command = this.queryBuilder.select(this.tableName, obj, this.properties);

		let result = await this.execute(command);

		if (result.error) {
			return result;
		}

		if (result.length === 1) {
			if (query && query.join) {
				return await this.join(result[0], query);
			}
			return result[0];
		} else if (result.length === 0) {
			return null;
		}
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

		let invalid = this.validate(params);

		if (invalid !== true) {
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "create"
				}
			};
		}

		let required = this.checkRequiredProperties(params, "create");

		if (required !== true) {
			return {
				error: {
					missing: required,
					data: data,
					action: "create"
				}
			};
		}

		await this.beforeCreate(params);

		let command = this.queryBuilder.insert(
			this.tableName,
			this.primaryKey,
			params,
			this.schema
		);

		let result = await this.execute(command);

		if (result.error) {
			return result;
		}

		let record = await this.read(data[this.primaryKey]);

		await this.afterCreate(data[this.primaryKey], record);

		return record;
	}


	/**
	 * Update one record
	 * @param id
	 * @param data
	 * @param query
	 * @returns {Promise<void>}
	 */
	async update(id, data, fetch) {

		let exists = await this.exists(id);

		if (exists) {
			data.updatedAt = now();

			let params = this.convertDataTypes(data);

			let required = this.checkRequiredProperties(params, "update");

			if (required !== true) {
				return {
					error: {
						missing: required,
						data: data,
						action: "update"

					}
				};
			}

			let invalid = this.validate(params);

			if (invalid !== true) {
				return {
					error: {
						invalid: invalid,
						data: data,
						action: "update"
					}
				};
			}

			let query = {};
			query[this.primaryKey] = id;

			if (params[this.primaryKey]) {
				delete params[this.primaryKey]; //you can't change primary Keys. Don't even try!!!
			}

			let proceed = await this.beforeUpdate(id, params);

			if (proceed) {
				let command = this.queryBuilder.update(this.tableName, query, params, this.properties);

				let result = await this.execute(command);
				if (result.error) {
					return result;
				}

				let record = await this.read(id);

				await this.afterUpdate(id, record);

				if (fetch) {
					return record;
				}

				return {
					id : id,
					action : "update",
					success : true
				}
			} else {
				return {
					error : "Update blocked by BeforeUpdate",
					[this.primaryKey] : id
				}
			}


		} else {
			return {
				error: {
					id: id,
					message: "Does not exist"
				}
			};
		}
	}

	async updateWhere(query, data) {

		data.updatedAt = now();

		let params = this.convertDataTypes(data);
		let required = this.checkRequiredProperties(params, "update");

		if (required !== true) {
			return {
				error: {
					missing: required,
					data: data,
					action: "updateWhere"
				}
			};
		}

		let invalid = this.validate(params);

		if (invalid !== true) {
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "updateWhere"
				}
			};
		}

		let command = this.queryBuilder.update(this.tableName, query, params, this.properties);

		let result = await this.execute(command);
		if (result.error) {
			return result;
		}
		return result;
	}

	/**
	 * search for one or more records
	 * @param query
	 * @returns {Promise<*>}
	 */
	async query(query) {
		let command = this.queryBuilder.select(this.tableName, query, this.properties);

		let result = await this.execute(command);
		if (result.error) {
			return result;
		}

		if (query.join) {
			return await this.join(result, query);
		} else {
			return result;
		}
	}

	/**
	 *
	 * @param query
	 * @returns {Promise<*>}
	 */
	async count(query) {
		let command = this.queryBuilder.count(this.tableName, this.primaryKey, query, this.properties);
		let result = await this.execute(command);

		if (result.error) {
			return result;
		}

		if (result) {
			if (this.db === "pg" && result[0].count) {
				return result[0].count;
			} else {
				let key = Object.keys(result[0]);
				return result[0][key];
			}
		} else {
			return 0;
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
		if (result.error) {
			return result;
		}
		return null;
	}

	/**
	 * destroy one record
	 * @param id
	 * @returns {Promise<*>}
	 */
	async destroy(id) {

		let record = await this.read(id);

		if (record) {

			let proceed = await this.beforeDestroy(id, record);

			if (proceed !== false) {
				let command = this.queryBuilder.delete(
					this.tableName,
					{
						where: {
							[this.primaryKey]: id
						}
					},
					this.properties
				);

				let result = await this.execute(command);

				await this.afterDestroy(id, record);

				return result;
			} else {
				return {
					error : "Blocked by beforeDestroy",
					tableName : this.tableName,
					id : id
				}
			}

		}
		return {
			error : "Record Not Found",
			tableName : this.tableName,
			id : id
		}


	}

	/**
	 * Delete one or more matching records
	 * @param query
	 * @returns {Promise<*>}
	 */
	async destroyWhere(query) {
		console.log("ModelBase::destroyWhere");
		let command = this.queryBuilder.delete(
			this.tableName,
			query,
			this.properties
		);
		let result = await this.execute(command);
		return result;
	}

	/**
	 * get an index of records by an optional key value pair
	 * @param key
	 * @param value
	 * @returns {Promise<*>}
	 */
	async index(query) {
		let keys = Object.keys(this.properties);

		if (query.select && _.isString(query.select)) {
			query.select = query.select.split(",");
		}

		if (query.select) {
			query.select = _.intersection(query.select, keys);
		}

		if (!query.select || query.select.length === 0) {
			query.select = _.intersection(['id', 'updatedAt', 'status'], keys);
		}

		return await this.query(query);
	}

	/**
	 * Does a record with the id exist
	 * @param id
	 * @returns {Promise<boolean>}
	 */
	async exists(id) {
		let command = this.queryBuilder.select(
			this.tableName,
			{
				where: {
					[this.primaryKey]: id,
				},
				select: [this.primaryKey],
				limit: 1
			},
			this.properties
		);

		this.lastCommand = command;

		let result = await this.execute(command);
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

		let command = this.queryBuilder.update(
			this.tableName,
			{
				where: {
					[this.primaryKey]: id
				}
			},
			{
				[key]: value
			},
			this.properties
		);

		try {
			let result = await this.execute(command);
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
		let command = this.queryBuilder.select(
			this.tableName,
			{
				where: {
					[this.primaryKey]: id
				},
				select: [key]
			}
		);

		try {
			let result = await this.execute(command);
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
	 * Run secondary queries for relations and foreign keys
	 * @param results
	 * @param query
	 * @returns {Promise<void>}
	 */
	async join(results, query) {

		//console.log("join " + this.tableName);

		if (!this.relationMappings && !this.relations && !this.foreignKeys) {
			return results;
		}

		let relations = this.relationMappings || this.relations || {};
		let foreignKeys = this.foreignKeys || {};
		let fromIndex = {};
		let findOne = false;

		if (!_.isArray(results)) {
			results = [results];
			findOne = true;
		}

		if (query.join === "*") {
			query.join = Object.keys(relations);
			query.join = query.join.concat(Object.keys(foreignKeys));
			//results[0].join = query.join;
		}

		let join = _.clone(query.join);

		if (_.isString(join)) {
			//console.log("JOIN IS A STRING");
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
			//console.log("JOIN IS AN ARRAY");
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
			//console.log("JOIN IS AN OBJECT");
			//not sure is there is anything to do here
			//console.log("Condition 3");
		}

		//console.log(join);

		for (let key in join) {
			if (relations[key]) {

				if (join[key] === true) {
					join[key] = {

					}
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

				for (let i = 0; i < results.length; i++) { //grab the primary keys from the
					if (results[i][joinFrom]) {
						targetKeys.push(results[i][joinFrom]);
						fromIndex[results[i][joinFrom]] = i;
					}
				}

				if (item.throughClass) { //build new targetKey based on the pivot table
					m = new item.throughClass(this.req);
					let j = _.clone(join[key]);
					j.where = j.where || {};
					j.where[joinThroughFrom] = {in: targetKeys};
					//j.join = query.join;
					j.select = [joinThroughFrom, joinThroughTo];
					throughList = await m.find(j);
					targetKeys = _.uniq(_.map(throughList, joinThroughTo));
				}

				switch (item.relation) {
					case "HasOne":
						m = new item.modelClass(this.req);
						join[key].where = join[key].where || {};
						join[key].where[joinTo] = {in: targetKeys};
						list = await m.find(join[key]);

						if (list.error) {
							//console.log(list.error);
							continue;
						}

						if (item.throughClass) {
							list.forEach(
								function (row) {
									let obj = {};
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
						join[key].where = join[key].where || {};
						join[key].where[joinTo] = {in: targetKeys};
						list = await m.find(join[key]);

						if (list.error) {
							//console.log(list.error);
							continue;
						}

						if (item.throughClass) {
							list.forEach(
								function (row) {
									let obj = {};
									obj[joinThroughTo] = row[joinTo];
									let throughItem = _.find(throughList, obj);
									let resultsIndex = fromIndex[throughItem[joinThroughFrom]];
									results[resultsIndex][key] = results[resultsIndex][key] || [];
									results[resultsIndex][key].push(row);
								}
							)
						} else {
							for (let i = 0; i < list.length; i++) {
								try {
									if (!results[fromIndex[list[i][joinTo]]][key]) {
										results[fromIndex[list[i][joinTo]]][key] = [];
									}
									results[fromIndex[list[i][joinTo]]][key].push(list[i]);
								} catch (e) {
									console.log("Could not join " + key + " for " + this.tableName);
									console.log("joinTo => " + joinTo);
								}
							}
						}

						break;
				}
			} else if (foreignKeys[key]) {
				let m = new foreignKeys[key].modelClass(this.req);
				let idList = [];
				results.forEach(
					function(item) {
						if (item[key] !== null) {
							idList.push(item[key]);
						}
					}
				)
				if (idList.length > 0) {
					let primaryKey = foreignKeys[key].to || m.primaryKey;
					let list = await m.query(
						{
							where: {
								[primaryKey]: {"in": idList}
							}
						}
					);
					if (!list.error) {
						list.forEach(
							function (item) {
								for (let i = 0; i < results.length; i++) {
									if (results[i][key] === item[primaryKey]) {
										results[i].foreignKeys = results[i].foreignKeys || {};
										results[i].foreignKeys[key] = item;
										break;
									}
								}
							}
						)
					}
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
		for (let key in data) {
			if (this.properties[key]) {
				params[key] = processType(data[key], this.properties[key]);
			}
		}
		return params;
	}



	/**
	 * Run through the data, compare against the schema, and make sure we have all the props with need
	 * @param data
	 * @param action
	 * @returns {Promise<*>}
	 */
	checkRequiredProperties(data, action) {
		if (action === "create") {
			let keys = [];

			for (let key in data) {
				if (!data[key] && this.properties[key].default) {
					data[key] = this.properties[key].default;
					keys.push(key);
				} else if (data[key]) {
					keys.push(key);
				}
			}

			let intersection = _.intersection(this.schema.required, keys); //keys found in input and required

			if (intersection.length < this.schema.required.length) {  //if the intersection is less than required, something is missing
				//these will be the values that are missing.
				let missing = _.difference(intersection, this.schema.required);
				if (missing.length > 0) {
					return missing
				} else {
					return true;
				}
			}

			return true;
		} else {
			let missing = [];

			for (let key in data) {
				if (!data[key] && _.indexOf(this.schema.required, key) !== -1) {
					missing.push(key);
				}
			}
			if (missing.length > 0) {
				return missing;
			} else {
				return true;
			}
		}
	}

	/**
	 *
	 * @param data
	 * @returns {*}
	 */
	validate(data) {
		let invalid = [];
		for (let key in data) {

			if (!this.properties[key]) {
				//console.log(this.tableName);
				//console.log(this.properties);
				console.log("validate => removing " + key);
				delete data[key];
				continue;
			}

			if (this.validation[key] && this.validation[key].validate) {
				if (this.validation[key].validate(key, data, this.schema) === false) {
					if (_.indexOf(this.schema.required, key) !== -1) {
						invalid.push(key);
					} else {
						delete data[key];
					}
					console.log("Invalid => " + key + " " + data[key]);
				}
			} else if (validateAgainstSchema(key, data, this.schema) === false) {
				if (_.indexOf(this.schema.required, key) !== -1 || data[key] !== null) {
					console.log("Invalid => " + key + " " + data[key]);
					invalid.push(key);
				}
			}
		}

		return invalid.length > 0 ? invalid : true;
	}

	convertToColumnNames(data) {
		let params = {};
		for (let key in data) {
			if (this.properties[key]) {
				params[this.properties[key].columnName] = data[key];
			}
		}

		return params;
	}

	/**
	 * Call the DB with query!!!
	 * @param command
	 * @param postProcess
	 * @returns {Promise<*>}
	 */
	async execute(command, postProcess) {

		let sql;
		try {
			sql = !_.isString(command) ? command.toString() : command;
		} catch (e) {
			return {
				error : e,
				message : "Error converting command to string"
			}
		}
		this.lastCommand = command;

		//console.log(sql);

		if (sql.toLowerCase().indexOf("select") === 0) {
			try {
				let results = await this.pool.query(sql);
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
				return {
					error : e
				};
			}
		} else {
			try {
				let results = await this.pool.query(sql);
				if (results.rows) {
					return results;
				} else {
					return {
						rows: results
					};
				}
			} catch (e) {
				this.lastError = e;
				return {
					error : e
				};
			}

		}
	}

	/**
	 * Convert underscores back to camel case. Most of this would have happened in the creation of the SQL query,
	 * however if you appended anything raw to the end, those might not yet have been converted
	 * @param result
	 * @returns {*}
	 */
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

	/**
	 * Before creating a record, pass the data over.
	 * This could be used to clean the data, check permission, etc
	 * @param data
	 * @returns {Promise<boolean>}
	 */
	async beforeCreate(data) {
		return true;
	}

	/**
	 * After the record has been created, you might want to do some additional work,
	 * like kick the record out to elastic search, or call some webhook
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async afterCreate(id, data) {
		return;
	}

	/**
	 * Before updating a record, you may wish to modify the data, or check pmerissions
	 * @param id
	 * @param data
	 * @returns {Promise<boolean>}
	 */
	async beforeUpdate(id, data) {
		return true;
	}

	/**
	 * After the record has been created, you might want to do some additional work,
	 * like kick the record out to elastic search, or call some webhook
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async afterUpdate(id, data) {
		return;
	}

	/**
	 * Before a record is destroyed, you might want to check permissions or run some process that if
	 * it fails, you wouldn't want to remove the record at this time.
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async beforeDestroy(id, data) {
		return true;
	}

	/**
	 * Now that record is gone, maybe you want to move it to some log file, or history table
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async afterDestroy(id, data) {
		return;
	}


}