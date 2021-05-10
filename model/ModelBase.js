const moment = require("moment-timezone");
const now = require("../helper/now");
const uuid = require("node-uuid");
const _ = require("lodash");
const inflector = require("../helper/inflector");
const processType = require("../helper/process-type");
const validateAgainstSchema = require("../helper/validate-against-schema");
const md5 = require("md5");
const connectionStringParser = require("../helper/connection-string-parser");
const getSchema = require("../helper/get-schema");
const getFields = require("../helper/get-fields");
const EventEmitter = require("events");
const cacheManager = require("../helper/cache-manager");
const trimObject = require("../helper/trim-object");

class ModelBase extends EventEmitter {

	/**
	 * @param schema - json schema for this model
	 * @param primaryKey - optional primary key, defaults to id
	 * @param req - the express request (or other object). looking for the request context really. req.role = "api-user"
	 * or req.account.id etc.
	 */
	constructor(req) {
		super();
		this.req = req;
		if (req && req.connectionString) {
			this._connectionString = req.connectionString;
		}
	}

	static getFields(tableName) {
		return getFields(tableName);
	}

	static getSchema(tableName) {
		return getSchema(tableName);
	}

	set tableName(value) {
		this._tableName = value;
	}

	get tableName() {
		if (this._tableName) {
			return this._tableName;
		}
		//return this.schema.tableName;

		let name = this.constructor.name.split("Model").join("");
		this._tableName = inflector.underscore(inflector.pluralize(name));
		return this._tableName;
	}

	get schema() {
		if (global.schemaCache && global.schemaCache[this.tableName]) {
			return global.schemaCache[this.tableName]
		}
		if (this._schema) {
			return this._schema;
		}
		return getSchema(this.tableName);
	}

	set schema(_value) {
		this._schema = value;
	}

	get fields() {
		if (global.fieldCache && global.fieldCache[this.tableName]) {
			return global.fieldCache[this.tableName]
		}
		if (this._fields) {
			return this._fields;
		}
		return getFields(this.tableName);
	}

	set fields(_value) {
		this._fields = value;
	}

	get properties() {
		return this.schema.properties;
	}

	get keys() {
		return Object.keys(this.schema.properties);
	}

	get primaryKey() {
		return this.schema.primaryKey;
	}

	get connectionString() {

		if (this._connectionString) {
			return this._connectionString;
		}

		let dataSource = this.dataSource || this.schema.dataSource;

		//Allow for generic naming like DEFAULT_DB
		if (process.env[dataSource]) {
			this._connectionString = process.env[dataSource];
		}

		//TODO Convert this to use a connection string parser

		for (let key in process.env) {

			if (process.env[key].indexOf("postgresql://") === -1 &&
				process.env[key].indexOf("mysql://") === -1 &&
				process.env[key].indexOf("mssql://") === -1) {
				continue;
			}

			let cs = connectionStringParser(process.env[key]);

			if (!cs) {
				console.log("Unknown connection string type");
				continue;
			}

			if (cs.database === dataSource) {
				this._connectionString = process.env[key];
				break;
			}
		}

		return this._connectionString || process.env.DEFAULT_DB;
	}

	/**
	 *
	 * @returns {Pool}
	 */
	async getPool(action) {
		if (this.connectionString.indexOf("postgresql://") === 0) {
			this.db = "pg";
			return await require("../helper/postgres-pool")(this.connectionString);
		} else if (this.connectionString.indexOf("mysql://") === 0) {
			this.db = "mysql"
			return await require("../helper/mysql-pool")(this.connectionString);
		} else if (this.connectionString.indexOf("mssql://") === 0) {
			this.db = "mssql"
			return await require("../helper/mssql-pool")(this.connectionString);
		}

		//TODO Elastic, Redis
	}

	/**
	 * Create a query builder in the DB flavor of choice
	 * @returns {module.QueryToSql|*}
	 */
	get queryBuilder() {
		if (this._builder) {
			return this._builder;
		}

		let builder;

		if (this.connectionString.indexOf("postgresql://") !== -1) {
			builder = require("../helper/query-to-pgsql");
		} else if (this.connectionString.indexOf("postgres://") !== -1) {
			builder = require("../helper/query-to-pgsql");
		} else if (this.connectionString.indexOf("mysql://") !== -1) {
			builder = require("../helper/query-to-mysql");
		} else if (this.connectionString.indexOf("mssql://") !== -1) {
			builder = require("../helper/query-to-mssql");
		}

		if (!builder) {
			console.log("Could not determine connection type ");
			//console.log(this.connectionString);
		}

		this._builder = new builder(this);
		return this._builder;
		//TODO MSSQL, ElasticSearch, Mongo, Redis
	}

	/**
	 * Allow for composite primary keys, kind of experimental
	 * @param id
	 * @param query
	 * @returns {{error: {message: string, statusCode: number}}}
	 */
	addPrimaryKeyToQuery(id, query) {
		query.where = query.where || {};
		if (_.isArray(this.primaryKey)) {
			id = id.split("|");
			if (id.length !== this.primaryKey.length) {
				return {
					error : {
						message : "Missing parts for primary key. Got " + id.length + " expected " + this.primaryKey.length,
						statusCode : 500
					}
				}
			}
			this.primaryKey.forEach(
				(key) => {
					query.where[key] = id[0];
					id.shift();
				}
			)
		} else {
			query.where[this.primaryKey] = id;
		}
	}

	/**
	 * @param {string | int} id - the primary key for the record
	 * @param {object} query - used to pass in select & join
	 * @param {boolean | string} cache - should the result be cached
	 * @returns {Promise<*>}
	 */
	async read(id, query, cache) {

		let cacheKey;
		if (cache) {
			cacheKey = this.tableName + "_read_" + id;
			if (query) {
				cacheKey += "_" + md5(JSON.stringify(query));
			}
			let record = await cacheManager.get(cacheKey);
			if (record) {
				return record;
			}
		}

		let obj = {
			where: {},
			select : null
		};

		this.addPrimaryKeyToQuery(id, obj);

		if (query && query.select) {
			obj.select = query.select;
			this.addJoinFromKeys(query, obj);
		}

		let command = this.queryBuilder.select(obj);

		let result = await this.execute(command);

		if (result.error) {
			return result;
		}

		if (result.length === 1) {
			result = result[0];
			result = await this.afterRead(result);
			if (query && query.join) {
				result = await this.joinRelations(result, query);
			}
			if (cacheKey) {
				await cacheManager.set(cacheKey, result, cache);
			}
			return result;
		} else if (result.length === 0) {
			return null;
		}
	}

	/**
	 * create a new record
	 * @param {object} - data
	 * @returns {Promise<*>}
	 */
	async create(data) {

		this.checkPrimaryKey(data);

		//TODO need some timestamp field by model
		if (this.properties[this.createdAt]) {
			data[this.createdAt] = now();
		}

		let {properties, relations} = this.convertDataTypes(data);

		let invalid = this.validate(properties);

		if (invalid !== true) {
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "create"
				}
			};
		}

		let required = this.checkRequiredProperties(properties, "create");

		if (required !== true) {
			return {
				error: {
					missing: required,
					data: data,
					action: "create"
				}
			};
		}

		await this.beforeCreate(properties);

		let command = this.queryBuilder.insert(properties);

		if (command.error) {
			return command;
		}

		let result = await this.execute(command);

		if (result.error) {
			return result;
		}

		let record = await this.read(data[this.primaryKey]);

		if (relations) {
			let result = await this.createRelations(record, relations);
			if (result) {
				_.extend(record, result);
			}
		}

		await this.afterCreate(data[this.primaryKey], record);

		return record;
	}

	/**
	 * Shorthand method for determining if a create or an update is necessary
	 * @param {object} query
	 * @param {object} data
	 * @returns {Promise<void|*>}
	 */
	async upsert(query, data) {
		let result = this.findOne(query);
		if (result) {
			return await this.update(result.id, data);
		} else {
			return await this.create(data);
		}
	}

	/**
	 * Update one record
	 * @param {string | int} id - the primary key for the record
	 * @param {object} data - an object containg the properties to update
	 * @param {boolean} fetch - return the full updated record
	 * @returns {Promise<void>}
	 */
	async update(id, data, fetch) {

		let exists = await this.exists(id);

		if (exists) {

			if (this.properties[this.updatedAt]) {
				data[this.updatedAt] = now();
			}

			let {properties, relations} = this.convertDataTypes(data);
			let required = this.checkRequiredProperties(properties, "update");

			if (required !== true) {
				return {
					error: {
						missing: required,
						data: data,
						action: "update"

					}
				};
			}

			let invalid = this.validate(properties);

			//console.log(invalid);

			if (invalid !== true) {
				return {
					error: {
						invalid: invalid,
						data: data,
						action: "update"
					}
				};
			}

			//console.log(params);

			let query = {};
			this.addPrimaryKeyToQuery(id, query);

			if (properties[this.primaryKey]) {
				delete properties[this.primaryKey]; //you can't change primary Keys. Don't even try!!!
			}

			let proceed = await this.beforeUpdate(id, properties);
			this.emit("beforeUpdate", properties);

			if (proceed) {

				let command = this.queryBuilder.update(query, properties);

				let result = await this.execute(command);

				if (result.error) {
					return result;
				}

				let record = await this.read(id);

				await this.afterUpdate(id, record);

				if (relations) {
					_.extend(record, relations);
					await this.updateRelations(record);
				}

				if (fetch) {
					return record;
				}

				return {
					id: id,
					action: "update",
					success: true
				}
			} else {
				return {
					error: "Update blocked by BeforeUpdate",
					[this.primaryKey]: id
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

	/**
	 * Update records matching a certain criteria
	 * @param query
	 * @param data
	 * @returns {Promise<{error: {data, missing: Promise<*>, action: string}}|{error}|*|{error: {data, invalid: *, action: string}}>}
	 */
	async updateWhere(query, data) {

		data[this.updatedAt] = now();

		let {properties, relations} = this.convertDataTypes(data);
		let required = this.checkRequiredProperties(properties, "update");

		if (required !== true) {
			return {
				error: {
					missing: required,
					data: data,
					action: "updateWhere"
				}
			};
		}

		let invalid = this.validate(properties);

		if (invalid !== true) {
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "updateWhere"
				}
			};
		}

		let command = this.queryBuilder.update(query, properties);
		let result = await this.execute(command);

		if (result.error) {
			return result;
		}
		return result;
	}

	/**
	 * search for one or more records. typically just use find and findone methods
	 * @param query
	 * @returns {Promise<*>}
	 */
	async query(query, cache) {
		let cacheKey;
		if (cache === true) {
			cacheKey = this.tableName + "_query_" + md5(JSON.stringify(query));
			let record = await cacheManager.get(cacheKey);
			if (record) {
				return record;
			}
		}

		let obj = _.clone(query);

		if (query && query.select) {
			obj.select = query.select;
			this.addJoinFromKeys(query, obj);
		}

		let command = this.queryBuilder.select(obj);

		if (_.isArray(query.sql)) {
			query.sql.forEach(
				(item) => {
					let key = Object.keys(item)[0];
					switch (key) {
						case "join" :
							command.joinRaw(item[key].query);
							if (item[key].where) {
								command.whereRaw(item[key].where);
							}
							this.debug = true;
							break;
						case "where" :
							command.whereRaw(item[key].query);
							break;
						case "group" :
							command.groupByRaw(item[key].query);
							break;
						case "having" :
							command.havingRaw(item[key].query);
							break;
					}
				}
			)
		}

		let result = await this.execute(command, this.queryBuilder.postProcess);

		if (result.error) {
			return result;
		}

		await this.afterFind(result);

		if (query.join) {
			result = await this.joinRelations(result, query);
		}

		if (cacheKey) {
			await cacheManager.set(cacheKey, result);
		}

		return result;
	}

	/**
	 * Get a count of records matching the criteria
	 * @param query
	 * @param cache
	 * @returns {Promise<{error}|*|number>}
	 */
	async count(query, cache) {
		let cacheKey;
		let result;

		if (cache === true) {
			cacheKey = this.tableName + "_count_" + md5(JSON.stringify(query));
			result = await cacheManager.get(cacheKey);
			if (result) {
				return result;
			}
		}

		//TODO need a fast count method for postgres
		let command = this.queryBuilder.count(query);
		result = await this.execute(command);

		if (result.error) {
			return result;
		}

		if (result) {
			if (this.db === "pg" && result[0].count) {
				result = result[0].count;
			} else {
				let key = Object.keys(result[0]);
				result = result[0][key];
			}
			if (cacheKey) {
				await cacheManager.set(cacheKey, result);
			}
			return result;
		} else {
			return 0;
		}
	}

	/**
	 * Psuedo for query
	 * @param query
	 * @returns {Promise<*>}
	 */
	async find(query, cache) {
		let cacheKey;
		let results;
		if (cache === true) {
			cacheKey = this.tableName + "_find_" + md5(JSON.stringify(query));
			results = await cacheManager.get(cacheKey);
			if (results) {
				return results;
			}
		}
		results = await this.query(query);

		if (results.error) {
			return results;
		}

		if (cacheKey) {
			await cacheManager.set(cacheKey, results);
		}

		return results;
	}

	/**
	 * Query to find one record
	 * @param query
	 * @returns {Promise<*>}
	 */
	async findOne(query, cache) {
		query.limit = 1;
		let cacheKey;
		let result;

		if (cache === true) {
			cacheKey = this.tableName + "_findone_" + md5(JSON.stringify(query));
			result = await cacheManager.get(cacheKey);
			if (result) {
				return result;
			}
		}

		result = await this.query(query);

		if (result.error) {
			return result;
		}

		if (result && result.length > 0) {
			if (cacheKey) {
				await cacheManager.set(cacheKey, result[0]);
			}

			return this.afterRead(result[0]);
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
			this.emit("beforeDestroy", id, record);

			if (proceed !== false) {
				let query = {};
				this.addPrimaryKeyToQuery(id, query);
				let command = this.queryBuilder.delete(query);

				let result = await this.execute(command);

				await this.afterDestroy(id, record);
				this.emit("afterDestroy", id, record);

				return result;
			} else {
				return {
					error: "Blocked by beforeDestroy",
					tableName: this.tableName,
					id: id
				}
			}

		}
		return {
			error: "Record Not Found",
			tableName: this.tableName,
			id: id
		}


	}

	/**
	 * Delete one or more matching records
	 * @param query
	 * @returns {Promise<*>}
	 */
	async destroyWhere(query) {
		let command = this.queryBuilder.delete(query);
		this.emit("beforeDestroyWhere", query);
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

		delete query.join;

		return await this.query(query);
	}

	/**
	 * Does a record with the id exist
	 * @param id
	 * @returns {Promise<boolean>}
	 */
	async exists(id) {

		let query = {
			where : {},
			limit : 1
		};
		this.addPrimaryKeyToQuery(id, query);

		let command = this.queryBuilder.select(query);

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

		let query = {
			where: {
			}
		};
		this.addPrimaryKeyToQuery(id, query);

		let command = this.queryBuilder.update(
			query,
			{
				[key]: value
			}
		);

		try {
			let result = await this.execute(command, this.queryBuilder.postProcess);
			return result;
		} catch (e) {
			//console.log(command.toString());
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
		let query = {
			where: {
			}
		};
		this.addPrimaryKeyToQuery(id, query);
		let command = this.queryBuilder.select(
			{
				query,
				select: [key]
			}
		);

		try {
			let result = await this.execute(command, this.queryBuilder.postProcess);
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
		console.log(this.properties[this.primaryKey]);
		if (!data[this.primaryKey]) {
			switch (this.properties[this.primaryKey].type) {
				case "string" :
					switch (this.properties[this.primaryKey].format) {
						//Allow custom? IE Parse Server Object Keys???
						default :
							data[this.primaryKey] = uuid.v4();
							break;
					}
					break;
				case "number" :
					if (!this.properties[this.primaryKey].autoIncrement) {
						//TODO shouldn't we get the next
					}
					break;
				default :
					data[this.primaryKey] = uuid.v4();
					break;
			}
		}
	}

	/**
	 * Make sure all the required keys of a join are present in the select.
	 * @param query
	 * @param obj
	 */
	addJoinFromKeys(query, obj) {
		if (!query) {
			return;
		}
		if (query.join) {
			let keys;
			let context = this;
			obj.select = obj.select || [];
			if (query.join === "*") {
				keys = Object.keys(this.relations);
			} else {
				keys = Object.keys(query.join);
			}
			keys.forEach(
				(k) => {
					if (!context.relations[k]) {
						return;
					}
					obj.select.push(context.relations[k].join.from)
					if (context.relations[k].where) {
						let whereKeys = Object.keys(context.relations[k].where);
						obj.select = obj.select.concat(whereKeys);
					}
				}
			)
			obj.select = _.uniq(obj.select);
		}

	}

	/**
	 * Run secondary queries for relations and foreign keys
	 * @param results
	 * @param query
	 * @returns {Promise<void>}
	 */
	async joinRelations(results, query) {
		let func = require("./model-base/join-relations");
		return await func(this, results, query)
	}

	async updateRelations(data) {
		let relations = this.relations || {};
		let keys = Object.keys(data);

		while(keys.length > 0) {
			let key = keys[0];

			if (relations[key]) {
				let relatedProperty = this.relations[key];

				if ("throughClass" in relatedProperty) {
					keys.shift();
					continue;
				}

				let Model = this.loadModel(relatedProperty.modelClass);
				let model = new Model(this.req);
				let primaryKey = model.primaryKey;
				let itemData = _.clone(data[key]);
				let result;
				switch (relatedProperty.relation) {
					case "HasOne":
						if (itemData instanceof Array && itemData.length === 1) {
							itemData = itemData[0];
						}
						if (primaryKey in itemData) {
							result = await this.update(itemData[primaryKey], itemData);
							if (!result.error) {
								data[key] = result;
							}
						}
					case "HasMany":
						if (!itemData instanceof Array) {
							itemData = [itemData];
						}
						for(let i = 0; i < itemData.length; i++) {
							if (primaryKey in itemData[i]) {
								result = await this.update(itemData[i][primaryKey], itemData[i]);
								if (!result.error) {
									data[key][i] = result;
								}
							}
						}
						break;
				}
			}
			keys.shift();
		}
	}

	async createRelations(data) {

		let relations = this.relations || {};
		let keys = Object.keys(data);

		while(keys.length > 0) {
			let key = keys[0];

			if (relations[key]) {
				let relatedProperty = this.relations[key];

				if ("throughClass" in relatedProperty) {
					keys.shift();
					continue;
				}

				let Model = this.loadModel(relatedProperty.modelClass);
				let model = new Model(this.req);
				let primaryKey = model.primaryKey;
				let itemData = _.clone(data[key]);
				let result;
				switch (relatedProperty.relation) {
					case "HasOne":
						if (itemData instanceof Array && itemData.length === 1) {
							itemData = itemData[0];
						}
						if (data[relatedProperty.join.from]) {
							itemData[relatedProperty.join.to] = data[relatedProperty.join.from];
							result = await this.create(itemData);
							if (!result.error) {
								data[key] = result;
							}
						}
					case "HasMany":
						if (!itemData instanceof Array) {
							itemData = [itemData];
						}
						for(let i = 0; i < itemData.length; i++) {
							if (data[relatedProperty.join.from]) {
								itemData[i][relatedProperty.join.to] = data[relatedProperty.join.from];
								result = await this.update(itemData[i][primaryKey], itemData[i]);
								if (!result.error) {
									data[key][i] = result;
								}
							}
						}
						break;
				}
			}
			keys.shift();
		}
	}

	/**
	 * Converts any input types to the correct one (eg. string to int) and convert objects to JSON
	 * @param data
	 * @returns {Promise<void>}
	 */
	convertDataTypes(data) {
		let properties = {};
		let relations = {};
		Object.keys(data).forEach(
			(key) => {
				if (this.relations && this.relations[key]) {
					relations[key] = data[key];
				} else if (this.properties[key]) {
					properties[key] = processType(data[key], this.properties[key]);
				}
			}
		)

		return {
			properties : Object.keys(properties).length > 0 ? properties : null,
			relations : Object.keys(relations).length > 0 ? relations : null
		};
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
					if (this.properties[key].default === "now") {
						data[key] = now();
					} else {
						data[key] = this.properties[key].default;
					}
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
				if (data[key] === null && _.indexOf(this.schema.required, key) !== -1) {
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
				console.log("validate => removing " + key);
				delete data[key];
				continue;
			}

			if (validateAgainstSchema(key, data, this.schema) === false) {
				if (data[key] === null && this.properties[key].allowNull === false) {
					console.log("Invalid 2 => " + key + " " + data[key]);
					invalid.push(key);
				} else if (_.indexOf(this.schema.required, key) !== -1 || data[key] !== null) {
					console.log("Invalid 2.1 " + this.tableName + " => " + key + " " + data[key]);
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
			console.log(e);
			return {
				error: e,
				message: "Error converting command to string"
			}
		}
		if (this.lastCommand === command) {
			//console.warn("Possible duplicate query");
		}
		this.lastCommand = command;

		if (this.debug) {
			console.log(sql.toString());
		}

		if (sql.toLowerCase().indexOf("select") === 0) {
			let pool = await this.getPool("read");

			try {
				let results = await pool.query(sql);

				if (results.recordset) { //mssql
					results = {
						rows: results.recordset
					}
				}

				if (this.connectionString.indexOf("mysql") === 0) {
					this.mysqlTextToObject(results.rows ? results.rows : results);
				}

				if (postProcess) {
					if (results.rows) {
						return this.postProcessResponse(results.rows);
					} else {
						return this.postProcessResponse(results);
					}
				} else {
					if (results.rows) {
						return trimObject(results.rows);
					} else {
						return results;
					}
				}

				//return results.rows;
			} catch (e) {
				this.lastError = e;
				e.sql = sql;
				console.log(sql);
				return {
					error: e
				};
			}
		} else {
			let pool = await this.getPool("write")
			try {
				let results = await pool.query(sql);

				if (results.recordset) { //mssql
					results = {
						rows: results.recordset
					}
				}

				if (results.rows) {
					return results;
				} else {
					return {
						rows: results
					};
				}

			} catch (e) {
				this.lastError = e;
				e.sql = sql;
				return {
					error: e
				};
			}

		}
	}


	getSelect(fieldset) {
		let rawfields = global.fieldCache[this.tableName][fieldset];

		let select = [];

		rawfields.forEach(
			function (item) {
				if (item.property && item.visible) {
					select.push(item.property);
				}
			}
		);

		return select;
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
						if (key.indexOf(".") !== -1) {
							let parts = key.split(".");
							let doDeep = (pieces, obj) => {
								obj = obj || {};
								if (pieces.length === 0) {
									return obj;
								}
								obj[pieces[0]] = obj[pieces[0]] || {};
								console.log('parts => ' + _.isArray(pieces));
								return doDeep(pieces.shift(), obj);
							}
							let columnName = parts[0];
							parts.shift();
							row[columnName] = row[columnName] || {};
							console.log("parts here " + _.isArray(parts));
							console.log(row[columnName]);
							let target = doDeep(parts, row[columnName]);
							target = row[key];
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

	mysqlTextToObject(results) {
		console.log("mysqlTextToObject");
		//Convert Objects
		let modelKeys = this.keys;
		let objectKeys = [];
		let boolKeys = [];
		let context = this;
		modelKeys.forEach(
			(key) => {
				if (context.properties[key].type === "array" || context.properties[key].type === "object") {
					objectKeys.push(key)
				} else if (context.properties[key].type === "boolean") {
					boolKeys.push(key);
				}
			}
		)

		if (objectKeys.length > 0 || boolKeys.length > 0) {
			results.forEach(
				function (row) {
					objectKeys.forEach(
						(key) => {
							try {
								row[key] = JSON.parse(row[key])
							} catch (e) {

							}
						}
					);
					boolKeys.forEach(
						(key) => {
							row[key] = row[key] === 1
						}
					)
				}
			);
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

	async afterRead(result) {
		if (!result || result.error) {
			return result;
		}
		let r = await this.afterQuery([result]);
		return r[0];
	}

	async afterQuery(results) {
		if (!results || !_.isArray(results) || results.length === 0) {
			return results;
		}
		let keys = Object.keys(results[0]);
		if (keys.join("_").indexOf(".") === -1) {
			return results;
		}
		let hash = {};
		let hasElements;
		let context = this;
		keys.forEach(
			(key) => {
				if (key.indexOf(".") !== -1) {
					let parts = key.split(".");
					if (context.properties[parts[0]]) {
						hasElements = true;
						hash[key] = hash[key] || {
							field : parts[0],
							subfield : parts[1] //TODO can we go deeper than one level???
						}
					}
				}
			}
		);
		if (hasElements) {
			results.forEach(
				function(row) {
					keys.forEach(
						(key) => {
							if (hash[key]) {
								row[hash[key].field] = row[hash[key].field] || {};
								let value = row[key];
								try {
									value = JSON.parse(row[key]);
								} catch (e) {
									//Not JSON.
								}
								row[hash[key].field][hash[key].subfield] = value;
								delete row[key];
							}
						}
					)
					if (row.id && row.record) {
						row.record.id = row.id; //TODO this should be done during insert
					}
				}
			);
		}
		return results;
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

	async afterFind(data) {
		if (this.afterQuery) {
			return await this.afterQuery(data)
		}
	}

	/**
	 * Override as needed to set the updatedAt column (if this table even has one). If this is complex, consider using beforeUpdate
	 * @returns {string}
	 */
	get updatedAt() {
		return "updatedAt";
	}

	/**
	 * Override as needed to set the createdAt column (if this table even has one). If this is complex, consider using beforeCreate
	 * @returns {string}
	 */
	get createdAt() {
		return "createdAt";
	}

	get relations() {
		return {};
	}

	get foreignKeys() {
		return {};
	}

	loadModel(modelName) {
		if (typeof modelName !== "string") {
			return modelName;
		}
		global.modelCache = global.modelCache || {};
		global.modelCache[modelName] = require("../../model/" + modelName);
		return global.modelCache[modelName];
	}

}

module.exports = ModelBase;
