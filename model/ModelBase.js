const now = require("../helper/now");
const uuid = require("node-uuid");
const _ = require("lodash");
const inflector = require("../helper/inflector");

const md5 = require("md5");
const connectionStringParser = require("../helper/connection-string-parser");
const getRelations = require("../helper/get-relations");
const getForeignKeys = require("../helper/get-foreign-keys");
const cacheManager = require("../helper/cache-manager");
const sleep = require('util').promisify(setTimeout);
const ModelUtils = require("./model-base/ModelUtils");
const ModelRelations = require("./model-base/ModelRelations")

class ModelBase {

	/**
	 * @param req - the express request (or other object). looking for the request context really. req.role = "api-user"
	 * or req.account.id etc.
	 */
	constructor(req) {
		this.req = req;
		if (req && req.connectionString) {
			this._connectionStringWrite = req.connectionString;
		}
	}

	async init() {
		await this.getSchema();
		await this.getFields();
		await this.getRelations();
		await this.getForeignKeys();
	}

	set tableName(value) {
		this._tableName = value;
	}

	/**
	 * Infer tablename is not specifically set
	 * @returns {*}
	 */
	get tableName() {
		if (this._tableName) {
			return this._tableName;
		}
		let name = this.constructor.name.split("Model").join("");
		this._tableName = inflector.underscore(inflector.pluralize(name));
		return this._tableName;
	}

	/**
	 * @returns {JsonSchema}
	 */
	get schema() {
		if (this._schema) {
			return this._schema;
		}
		if (global.schemaCache[this.tableName]) {
			this.log("get schema", "from cache");
			this._schema = global.schemaCache[this.tableName];
		}
		return this._schema;
	}
	/**
	 * @returns {JsonSchema}
	 */
	async getSchema() {
		if (!global.schemaCache || !this.schema) {
			let M = require("./SchemaModel");
			let m = new M(this.req);
			await m.getSchema();
			this._schema = await m.get(this.tableName);
		}
		return this.schema;
	}

	set schema(_value) {
		this._schema = value;
	}

	/**
	 * @type {Object}
	 * @property adminIndex
	 * @property adminUpdate
	 * @property adminRead
	 * @property adminCreate
	 * @property publicIndex
	 * @property publicUpdate
	 * @property publicRead
	 * @property publicCreate
	 */
	get fields() {
		if (this._fields) {
			return this._fields
		}
		if (global.fieldCache[this.tableName]) {
			this._fields = global.fieldCache[this.tableName];
		}
		return this._fields;
	}

	set fields(_value) {
		this._fields = value;
	}

	async getFields() {
		this.log("getFields");
		if (!global.fieldCache || !this.fields) {
			let M = require("./FieldModel");
			let m = new M(this.req);
			await m.init();
			this._fields = await m.get(this.tableName);
		}
		return this.fields;
	}

	get properties() {
		if(this._properties) {
			return this._properties;
		}
		if (this.schema) {
			this._properties = this.schema.properties;
		}
		return this._properties;
	}

	async getProperties() {
		if (!this.properties) {
			this._properties = await this.getSchema().properties;
		}
		return this.properties;
	}

	get keys() {
		return Object.keys(this.properties);
	}

	getCacheKey(query, id) {
		let cacheKey = this.tableName + "_" + (id ? id : "");
		if (query) {
			cacheKey += "_" + md5(JSON.stringify(query));
		}
		return cacheKey
	}

	get primaryKey() {
		if(this._primaryKey) {
			return this._primaryKey;
		}
		if (this.schema) {
			this._primaryKey = this.schema.primaryKey;
		}
		if (!this._primaryKey) {
			throw new Error("Could not find primaryKey ->" + this.tableName);
		}
		return this._primaryKey;
	}

	async getPrimaryKey() {
		if (!this.primaryKey) {
			this._primaryKey = await this.getSchema(this.tableName).primaryKey;
		}
		return this.primaryKey;
	}

	get relations() {
		return this._relations;
	}

	async getRelations() {
		if (!this.relations) {
			this._relations = await getRelations(this.tableName, this);
		}
		return this.relations;
	}

	get foreignKeys() {
		return this._foreignKeys;
	}

	async getForeignKeys() {
		if (!this.foreignKeys) {
			this._foreignKeys = await getForeignKeys(this.tableName, this);
		}
		return this.foreignKeys;
	}

	connectionString(action) {
		let dataSource = this.dataSource || this.schema.dataSource;
		action = action.toLowerCase() === "read" ? "Read" : "Write";
		let dataSourceAction = (dataSource + "_" + action).toUpperCase();
		//console.log(this.tableName + " looking for " + dataSourceAction + " or " + dataSource);

		switch (action) {
			case "Read" :
				if (this._connectionStringRead) {
					//console.log("Found CS " + action);
					return this._connectionStringRead;
				}
				break;
			default :
				if (this._connectionStringWrite) {
					//console.log("Found CS " + action);
					return this._connectionStringWrite;
				}
				break;
		}

		//Try Based on datasource in schema
		switch (action) {
			case "Read" :
				if (process.env[dataSourceAction]) {
					this._connectionStringRead = process.env[dataSourceAction];
				} else if (process.env[dataSource]) {
					this._connectionStringRead = process.env[dataSource];
				}
				break;
			default :
				if (process.env[dataSourceAction]) {
					this._connectionStringWrite = process.env[dataSourceAction];
				} else if (process.env[dataSource]) {
					this._connectionStringWrite = process.env[dataSource];
				}
				break;
		}

		if (this["_connectionString" + action]) {
			return this["_connectionString" + action];
		}

		dataSourceAction = ("DEFAULT_DB_" + action).toUpperCase();

		//Try Based on Default DB
		switch (action) {
			case "Read" :
				if (process.env[dataSourceAction]) {
					this._connectionStringRead = process.env[dataSourceAction];
				} else if (process.env["DEFAULT_DB"]) {
					this._connectionStringRead = process.env["DEFAULT_DB"];
				}
				break;
			default :
				if (process.env[dataSourceAction]) {
					this._connectionStringWrite = process.env[dataSourceAction];
				} else if (process.env["DEFAULT_DB"]) {
					this._connectionStringWrite = process.env["DEFAULT_DB"];
				}
				break;
		}

		if (this["_connectionString" + action]) {
			return this["_connectionString" + action];
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
				this.log("connectionString", "Unknown connection string type");
				continue;
			}

			if (cs.database === dataSource) {
				if (action === "Read" && key.indexOf("_READ") !== -1) {
					this._connectionStringRead = process.env[key];
					return this._connectionStringRead;
				} else {
					this._connectionStringWrite = process.env[key];
					return this._connectionStringWrite;
				}

				break;
			}
		}

		throw new Error("Indeterminate Connection String");
	}

	dbType() {
		let cs = this.connectionString("read");
		if (cs.indexOf("postgresql://") === 0) {
			this.db = "postgres";
		} else if (cs.indexOf("mysql://") === 0) {
			this.db = "mysql"
		} else if (cs.indexOf("mssql://") === 0) {
			this.db = "mssql"
		}
		return this.db;
	}

	/**
	 *
	 * @returns {Pool}
	 */
	async getPool(action) {
		let cs = this.connectionString(action);
		if (cs.indexOf("postgresql://") === 0) {
			this.db = "pg";
			return await require("../helper/postgres-pool")(cs);
		} else if (cs.indexOf("mysql://") === 0) {
			this.db = "mysql"
			return await require("../helper/mysql-pool")(cs);
		} else if (cs.indexOf("mssql://") === 0) {
			this.db = "mssql"
			return await require("../helper/mssql-pool")(cs);
		}

		//TODO Elastic, Redis
	}

	async getClient(action) {
		let pool = await this.getPool(action);
		let client;
		switch (this.db) {
			case "pg" :
				client = await pool.connect();
				return client;
			case "mysql" :
				return pool;
			default :
				return pool;
		}
	}

	async releaseClient(client) {
		if (client.release) {
			await client.release();
		}
		return true;
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
		let cs = this.connectionString("read");

		if (cs.indexOf("postgresql://") !== -1) {
			builder = require("../helper/query-to-pgsql");
		} else if (cs.indexOf("postgres://") !== -1) {
			builder = require("../helper/query-to-pgsql");
		} else if (cs.indexOf("mysql://") !== -1) {
			builder = require("../helper/query-to-mysql");
		} else if (cs.indexOf("mssql://") !== -1) {
			builder = require("../helper/query-to-mssql");
		}

		if (!builder) {
			throw new Error("Could not determine connection type");
		}
		this._builder = new builder(this);
		return this._builder;
		//TODO MSSQL, ElasticSearch, Mongo, Redis
	}

	/**
	 * @param {string | int} id
	 * @param query
	 * @returns {{error: {message: string, statusCode: number}}}
	 */
	addPrimaryKeyToQuery(id, query) {
		ModelUtils.addPrimaryKeyToQuery(this, id, query);
	}

	/**
	 *
	 * @param {string | int} id
	 * @param query - used to pass in select & join
	 * @returns {Promise<*>}
	 */
	async read(id, query, cache) {
		await this.getSchema();
		this.log("read", id);
		let cacheKey;
		if (cache === true) {
			cacheKey = this.getCacheKey(query, id);
			let record = await cacheManager.get(cacheKey);
			if (record) {
				return record;
			}
		}

		let obj = {
			where: {},
			select : null
		};

		ModelUtils.addPrimaryKeyToQuery(this, id, obj);

		if (query && query.select) {
			obj.select = query.select;
			ModelUtils.addJoinFromKeys(this, query, obj);
		}

		let builder = this.queryBuilder;
		let command = builder.select(obj);

		let result = await this.execute(command);

		if (result.error) {
			return result;
		}

		if (result.length === 1) {
			result = result[0];
			result = await this.afterRead(result);
			if (query && query.join) {
				result = await ModelRelations.join(this, result, query);
			}
			if (cacheKey) {
				await cacheManager.set(cacheKey, result);
			}
			return result;
		} else if (result.length === 0) {
			return null;
		}
	}

	/**
	 * create a new record
	 * @param data
	 * @returns {Promise<*>}
	 */
	async create(data)
	{
		this.log("create");
		await this.getSchema();
		let sleepCount = 0;
		ModelUtils.checkPrimaryKey(this, data);

		//TODO need some timestamp field by model
		if (this.properties[this.createdAt]) {
			data[this.createdAt] = now();
		}

		let params = await ModelUtils.convertDataTypes(this, data);
		let invalid = await this.schema.validateObject(params, "create");

		if (invalid !== true) {
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "create"
				}
			};
		}

		let required = await ModelUtils.checkRequiredProperties(this, params, "create");

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

		console.log(params);

		let command = this.queryBuilder.insert(params);

		if (command.error) {
			return {
				error : {
					message : "Bad SQL Create",
					e: command.error
				}
			};
		}

		let result = await this.execute(command);

		if (result.error) {
			return result;
		}
		if (!result) {
			return {
				error : {
					message : this.tableName + ' create failure',
					data : data
				}
			}
		}

		let getRecord = async () => {
			let record = await this.read(data[this.primaryKey]);
			if (!record) {
				if (sleepCount < 4) {
					this.log("create", "Sleeping on Create " + sleepCount);
					sleepCount++;
					await sleep(500);
					return await getRecord();
				}
			}
			return record;
		}

		let record = await getRecord();

		if (record) {
			record.sleepCount = sleepCount;
			await this.afterCreate(data[this.primaryKey], record);
			return record;
		}

		return data;

		//This may happen if using a separate reader / writer server.
		this.log("create", "Could Not Read after create " + this.tableName + " -> "+ data[this.primaryKey]);

		return {
			error : {
				message : "Could Not Read after create " + this.tableName + " -> "+ data[this.primaryKey]
			}
		}
	}

	/**
	 * Shorthand method for determining if a create or an update is necessary
	 * @param query
	 * @param data
	 * @returns {Promise<void|*>}
	 */
	async upsert(query, data) {
		this.log("upsert");
		let result = this.findOne(query);
		if (result) {
			return await this.update(result.id, data);
		} else {
			return await this.create(data);
		}
	}

	/**
	 * Update one record
	 * @param id
	 * @param data
	 * @param fetch
	 * @returns {Promise<void>}
	 */
	async update(id, data, fetch) {
		this.log("update");
		await this.getSchema();

		let params = await ModelUtils.convertDataTypes(this, data);

		let exists = await this.exists(id);
		if (!exists) {
			return {
				error : {
					id : id,
					message : "Record " + id + " does not exist"
				}
			}
		}

		if (this.properties[this.updatedAt]) {
			params[this.updatedAt] = now();
		}

		let required = await ModelUtils.checkRequiredProperties(this, params, "update");

		if (required !== true) {
			this.log("update", required);
			return {
				error: {
					missing: required,
					data: data,
					action: "update"

				}
			};
		}

		let invalid = await this.schema.validateObject(params, "update");

		if (invalid !== true) {
			this.log("update", invalid);
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "update"
				}
			};
		}

		let query = {};
		ModelUtils.addPrimaryKeyToQuery(this, id, query);

		if (params[this.primaryKey]) {
			delete params[this.primaryKey]; //you can't change primary Keys. Don't even try!!!
		}

		let proceed = await this.beforeUpdate(id, params);

		console.log(params);

		if (proceed) {
			let command = this.queryBuilder.update(query, params);

			let result = await this.execute(command);

			if (result.error) {
				return result;
			}

			await this.afterUpdate(id, params);

			if (fetch) {
				let record = await this.read(id);
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
	}

	async updateWhere(query, data) {
		await this.getSchema();
		data[this.updatedAt] = now();

		let params = await ModelUtils.convertDataTypes(this, data);
		let required = await ModelUtils.checkRequiredProperties(this, params, "update");

		if (required !== true) {
			return {
				error: {
					missing: required,
					data: data,
					action: "updateWhere"
				}
			};
		}

		let invalid = await this.schema.validateObject(params, "update");

		if (invalid !== true) {
			return {
				error: {
					invalid: invalid,
					data: data,
					action: "updateWhere"
				}
			};
		}

		let command = this.queryBuilder.update(query, params);
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
	async query(query, cache) {
		await this.getSchema();

		let cacheKey;
		if (cache === true) {
			cacheKey = this.getCacheKey(query);
			let record = await cacheManager.get(cacheKey);
			if (record) {
				return record;
			}
		}

		let obj = _.clone(query);

		if (query && query.select && query.join) {
			obj.select = query.select;
			await this.getRelations();
			ModelUtils.addJoinFromKeys(this, query, obj);
		}

		let command = this.queryBuilder.select(obj);

		let result = await this.execute(command, this.queryBuilder.postProcess);

		if (result.error) {
			return result;
		}

		await this.afterFind(result);

		if (query.join) {
			result = await ModelRelations.join(this, result, query);
		}

		if (cacheKey) {
			await cacheManager.set(cacheKey, result);
		}

		return result;
	}

	/**
	 *
	 * @param query
	 * @returns {Promise<*>}
	 */
	async count(query, cache) {
		await this.getSchema();
		let cacheKey;
		let result;

		if (cache === true) {
			cacheKey = this.getCacheKey(query, "count");
			result = await cacheManager.get(cacheKey);
			if (result) {
				return result;
			}
		}

		/*
		//TODO Do this in query-to-pgsql
		if (this.dbType === "postgres") {
			let command = `SELECT reltuples as rows FROM pg_class WHERE relname = '${this.tableName}';`
			let result = await this.execute(command);
			if (result.length > 0) {
				return result[0].rows
			}
			return 0;
		}
		 */

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
				await cacheManager.set(cacheKey, result, 5);
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
		await this.getSchema();
		let cacheKey;
		let results;
		if (cache === true) {
			cacheKey = this.getCacheKey(query, "find");
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
		await this.getSchema();
		query.limit = 1;
		let cacheKey;
		let result;

		if (cache === true) {
			cacheKey = this.getCacheKey(query, "findone");
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
		this.log("destroy", id);
		await this.getSchema();
		let record = await this.read(id);

		if (record) {

			let proceed = await this.beforeDestroy(id, record);

			if (proceed !== false) {
				let query = {};
				if (this.schema.validateProperty(this.primaryKey,id) === true) {
					this.addPrimaryKeyToQuery(id, query);
				} else {
					return {
						error : {
							message : "Invalid Primary Key Used for Delete"
						}
					}
				}

				let command = this.queryBuilder.delete(query);
				let result = await this.execute(command);
				await this.afterDestroy(id, record);

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
		await this.getSchema();
		let command = this.queryBuilder.delete(query);
		let result = await this.execute(command);
		return result;
	}


	/**
	 * Does a record with the id exist
	 * @param id
	 * @returns {Promise<boolean>}
	 */
	async exists(id, cache) {
		await this.getSchema();
		let query = {
			where : {},
		};
		ModelUtils.addPrimaryKeyToQuery(this, id, query);
		let result = await this.count(query, cache);
		return result > 0;
	}

	/**
	 * Shorthand method for updating one column in a row
	 * @param id
	 * @param key
	 * @param value
	 * @returns {Promise<*>}
	 */
	async setKey(id, key, value) {
		await this.getSchema();
		let obj = {}
		obj[key] = value;

		if (!await this.exists(id, true)) {
			return null;
		}

		let query = {
			where: {
			}
		};
		ModelUtils.addPrimaryKeyToQuery(this, id, query);

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
		await this.getSchema();
		let query = {
			where: {
			}
		};
		ModelUtils.addPrimaryKeyToQuery(id, query);
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
	 *
	 * @param results
	 * @param query
	 * @returns {Promise<*|*[]>}
	 * @deprecated
	 */
	async join(results, query) {
		return await ModelRelations.join(this, results, query)
	}

	/**
	 * Call the DB with query!!!
	 * @param {queryBuilder | string }command
	 * @param {boolean} postProcess
	 * @returns {Promise<*>}
	 */
	async execute(command, client) {
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

		this.lastCommand = command;

		this.log("execute", sql.toString());

		if (sql.toLowerCase().indexOf("select") === 0) {
			client = client || await this.getClient("read");
			let results;
			try {
				results = await client.query(sql);
			} catch (e) {
				e.sql = sql;
				this.lastError = e;
				return {
					error: {
						message : e.message,
						sql : sql
					}
				};
			}

			switch (this.db) {
				case "mssql" :
					results = results.recordset;
					break;
				case "mysql" :
					const MySqlTextToObject = require("./model-base/MySqlTextToObject")
					results = MySqlTextToObject.convert(this, results.rows ? results.rows : results);
					break;
				case "pg" :
					results = results.rows;
					break;
			}

			return results;

		} else {
			client = client || await this.getClient("write");
			let results = {error: {
				message : "Nothing Happened"
			}};
			try {
				results = await client.query(sql);
			} catch (e) {
				this.lastError = e;
				e.sql = sql;
				return {
					error: {
						message : e.message,
						sql : sql
					}
				};
			}
			await this.releaseClient(client);

			switch (this.db) {
				case "mysql" :
					results = results.recordset;
					break;
				case "mysql" :
					if (results.insertId > 0) { //mySQL //TODO what is pg/mssql?
						results = {
							[this.primaryKey] : results.insertId
						}
					}
					break;
				case "pg" :
					//TODO What is the insert ID for an autoicrement table?
					break;
			}

			if (!results) {
				results = {};
			}

			return results;
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
		return ModelUtils.convertDotFieldsToObjects(this, results);
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

	get name() {
		return "name";
	}

	/**
	 * Helper method to load a model by name
	 * @param modelName
	 * @returns {Class}
	 */
	loadModel(modelName) {
		if (typeof modelName !== "string") {
			return modelName;
		}
		global.modelCache = global.modelCache || {};
		global.modelCache[modelName] = require("../../model/" + modelName);
		return global.modelCache[modelName];
	}

	log(method, message) {
		if (this.debug) {
			console.log(this.tableName + (method ? "::" + method : "") + (message ? " -> " + message : ""));
		}
	}

}

module.exports = ModelBase;
