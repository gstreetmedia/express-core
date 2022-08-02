const now = require("../helper/now");
const _ = require("lodash");
const inflector = require("../helper/inflector");
const md5 = require("md5");
const CacheableBase = require("../object/CacheableBase");
const connectionStringParser = require("../helper/connection-string-parser");
const getRelations = require("../helper/get-relations");
const getForeignKeys = require("../helper/get-foreign-keys");
const getModel = require("../helper/get-model");
const sleep = require('util').promisify(setTimeout);
const ModelUtils = require("./model-base/ModelUtils");
const ModelRelations = require("./model-base/ModelRelations");
const util = require("util");
const beautify = require("json-beautify");
let AWS;
if (process.env.CORE_AWS_ENABLED) {
	AWS = require('aws-sdk');
	AWS.config.update({region: 'us-west-2'});
}

class ModelBase extends CacheableBase{

	/**
	 * @param req - the express request (or other object). looking for the request context really. req.role = "api-user"
	 * or req.account.id etc.
	 */
	constructor(req) {
		super();
		if (req) {
			this.req = req;
			if (this.req.locals.connectionString) {
				this._connectionStringWrite = req.locals.connectionString;
				this._connectionStringRead = req.locals.connectionString;
			}
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
		if (global.schemaCache && global.schemaCache[this.tableName]) {
			this._schema = global.schemaCache[this.tableName];
		}
		return this._schema;
	}

	/**
	 *
	 * @returns {string}
	 */
	get defaultSort() {
		if (this.primaryKey) {
			return this.primaryKey + " ASC";
		}
		return this.properties[0].columnName + " ASC";
	}

	/**
	 * @returns {JsonSchema}
	 */
	async getSchema() {
		if (!this.schema) {
			let M = require("./SchemaModel");
			let m = new M(this.req);
			m.debug = this.debug;
			await m.getSchema();
			this._schema = await m.get(this.tableName);
		}
		return this.schema;
	}

	set schema(value) {
		this._schema = value;
	}

	/**
	 * @type {Object}
	 * @property adminIndex - listing
	 * @property adminUpdate - updating
	 * @property adminRead - viewing
	 * @property adminCreate - creating
	 * @property publicIndex - listing
	 * @property publicUpdate - updating
	 * @property publicRead - viewing
	 * @property publicCreate - creating
	 */
	get fields() {
		if (this._fields) {
			return this._fields
		}
		if (global.fieldCache && global.fieldCache[this.tableName]) {
			this.log("get fields", "from cache");
			this._fields = global.fieldCache[this.tableName];
		}

		return this._fields;
	}

	set fields(value) {
		this._fields = value;
	}

	async getFields() {
		if (!this.fields) {
			let M = require("./FieldModel");
			let m = new M(this.req);
			m.debug = this.debug;
			await m.init();
			let fields = await m.get(this.tableName);
			if (!fields) {
				fields = [];
				this.schema.keys.forEach(
					(key) => {
						fields.push(
							{
								property: key,
								visible: true
							}
						)
					}
				)
				this._fields = {adminIndex: fields, adminRead: fields, adminUpdate: fields, adminCreate: fields};
			}
		}
		return this.fields;
	}

	/**
	 * @returns {*|JsonSchema.properties|*}
	 */
	get properties() {
		if (this._properties) {
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
		return this.schema.keys;
	}

	/**
	 * Generate a unique cache key for this request
	 * @param query
	 * @param [id]
	 * @returns {string}
	 */
	getCacheKey(query, id) {
		let cacheKey = this.tableName + "_" + (id ? id : "");
		if (query) {
			cacheKey += "_" + md5(JSON.stringify(query));
		}
		return cacheKey
	}

	/**
	 * @returns {*|JsonSchema.primaryKey|*}
	 */
	get primaryKey() {
		//TODO make sure we support composite primary keys
		if (this._primaryKey) {
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
			this._primaryKey = this.getSchema(this.tableName).primaryKey;
		}
		return this.primaryKey;
	}

	/**
	 * @returns {object}
	 */
	get relations() {
		return this._relations;
	}

	async getRelations() {
		if (!this.relations) {
			this._relations = await getRelations(this.tableName, this) || {};
		}
		return this.relations;
	}

	/**
	 * @returns {object}
	 */
	get foreignKeys() {
		return this._foreignKeys;
	}

	async getForeignKeys() {
		if (!this.foreignKeys) {
			this._foreignKeys = await getForeignKeys(this.tableName, this) || {};
		}
		return this.foreignKeys;
	}

	/**
	 * @param {string} action (read,write)
	 * @returns {string}
	 */
	connectionString(action) {
		let dataSource = this.dataSource;
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
				process.env[key].indexOf("mssql://") === -1 &&
				process.env[key].indexOf("redis://") === -1 &&
				process.env[key].indexOf("elastic://") === -1 &&
				process.env[key].indexOf("mongo://") === -1
			) {
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

	/**
	 * @returns {string|*}
	 */
	dbType() {
		let cs = this.connectionString("read");
		if (cs.indexOf("postgresql://") === 0) {
			this.db = "postgres";
		} else if (cs.indexOf("mysql://") === 0) {
			this.db = "mysql"
		} else if (cs.indexOf("mssql://") === 0) {
			this.db = "mssql"
		} else if (cs.indexOf("redis://") === 0) {
			this.db = "redis"
		} else if (cs.indexOf("mongo://") === 0) {
			this.db = "mongo"
		} else if (cs.indexOf("elastic://") === 0) {
			this.db = "elastic"
		}
		return this.db;
	}

	/**
	 *
	 * @returns {Pool}
	 */
	async getPool(action) {
		let cs;
		if (util.types.isAsyncFunction(this.connectionString)) {
			cs = await this.connectionString(action);
		} else {
			cs = this.connectionString(action);
		}

		if (cs.indexOf("postgresql://") === 0) {
			this.db = "pg";
			return await require("./model-base/pool-postgres")(cs, this.req);
		} else if (cs.indexOf("mysql://") === 0) {
			this.db = "mysql"
			return await require("./model-base/pool-mysql")(cs, this.req);
		} else if (cs.indexOf("mssql://") === 0) {
			this.db = "mssql"
			return await require("./model-base/pool-mssql")(cs, this.req);
		} else if (cs.indexOf("redis://") === 0) {
			this.db = "redis"
			return await require("./model-base/pool-redis")(cs, this.req);
		} else if (cs.indexOf("elastic://") === 0) {
			this.db = "elastic"
			return await require("./model-base/pool-elastic")(cs, this.req);
		} else if (cs.indexOf("mongo://") === 0) {
			this.db = "mongo"
			return await require("./model-base/pool-mongo")(cs, this.req);
		}

		//TODO Elastic, Redis
	}

	async getClient(action) {
		this.pool = this.pool || {};
		action = action || "write";
		let targetPool = this.pool[action];

		if (targetPool && targetPool.hasOwnProperty("pool") && targetPool.pool.hasOwnProperty("ended")) {
			if (targetPool.pool.ended === true) {
				delete this.pool[action];
				targetPool = null;
			}
		}

		if (!targetPool) {
			this.pool[action] = await this.getPool(action);
		}

		switch (this.db) {
			case "pg" :
				return this.pool[action];
			case "mysql" :
				return this.pool[action];
			case "mssql" :
				return this.pool[action];
			case "redis" :
				return this.pool[action];
			case "elastic" :
				return this.pool[action];
			case "mongo" :
				//TODO Return Collection
				return this.pool[action];
			default :
				return this.pool[action];
		}
	}

	async releaseClient(client) {
		return;
		switch (this.db) {
			case "pg" :
			case "mysql" :
			case "mssql" :
			case "redis" :
			case "elastic" :
			case "mongo" :
			//TODO Return Collection
			default :
		}
		return true;
	}

	/**
	 * Create a query builder in the DB flavor of choice
	 * @returns {QueryToSqlBase}
	 */
	get builder() {
		if (this._builder) {
			return this._builder;
		}

		let builder;
		let cs = this.connectionString("read");


		if (cs.indexOf("postgresql://") !== -1) {
			builder = require("./model-base/QueryToPgSql");
		} else if (cs.indexOf("postgres://") !== -1) {
			builder = require("./model-base/QueryToPgSql");
		} else if (cs.indexOf("mysql://") !== -1) {
			builder = require("./model-base/QueryToMysql");
		} else if (cs.indexOf("mssql://") !== -1) {
			builder = require("./model-base/QueryToMssql");
		} else if (cs.indexOf("redis://") !== -1) {
			builder = require("./model-base/QueryToRedis");
		} else if (cs.indexOf("elastic://") !== -1) {
			builder = require("./model-base/QueryToElastic");
		} else if (cs.indexOf("mongo://") !== -1) {
			builder = require("./model-base/QueryToMongo");
		}

		if (!builder) {
			throw new Error("Could not determine connection type");
		}
		this._builder = new builder(this);
		return this._builder;
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
	 * @param {string|int} id
	 * @param {object} [query] - used to pass in select & join
	 * @param {boolean|number} [cache]
	 * @returns {object|Promise}
	 */
	async read(id, query, cache) {
		if (query && query.join) {
			query.include = query.join;
			delete query.join;
		}
		if (!id) {
			return {
				error : {
					message : "Calls to read method must contain an id"
				}
			}
		}
		this.log("read", id);
		await this.init();

		let cacheKey;
		if (cache === true) {
			cacheKey = this.getCacheKey(query, id);
			let record = await this.cacheManager.get(cacheKey);
			if (record) {
				this.req.locals.cached = true;
				return record;
			}
		}

		let obj = {
			where: {},
			select: null
		};

		ModelUtils.addPrimaryKeyToQuery(this, id, obj);
		await ModelUtils.addJoinFromKeys(this, query, obj);

		let builder = this.builder;
		let {statement} = await builder.select(obj);
		let result = await this.execute(statement);

		if (result.error) {
			return result;
		}

		if (result.length === 1) {
			result = result[0];
			result = await this.afterRead(result);
			if (query && query.include) {
				result = await ModelRelations.include(this, result, query);
			}
			if (cacheKey) {
				await this.cacheManager.set(cacheKey, result);
			}
			return result;
		} else if (result.length === 0) {
			return null;
		}
	}

	/**
	 * create a new record
	 * @param data
	 * @returns {object|Promise}
	 */
	async create(data) {
		this.log("create");
		await this.init();
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

		let builder = this.builder;
		let {statement} = await builder.insert(params);
		let result = await this.execute(statement);

		if (result.error) {
			return result;
		}
		if (!result) {
			return {
				error: {
					message: this.tableName + ' create failure',
					data: data
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
	}

	/**
	 * Shorthand method for determining if a create or an update is necessary
	 * @param data
	 * @returns {object|Promise}
	 */
	async upsert(data) {
		this.log("upsert");
		let result = this.exists(data[this.primaryKey]);
		if (result) {
			if (result[this.primaryKey]) {
				return this.update(result[this.primaryKey], data);
			} else {
				return {
					error : {
						message : "Found existing record during upsert, but could not determine primary key"
					}
				}
			}
		} else {
			return this.create(data);
		}
	}

	/**
	 * search for one or more records
	 * @param {object} query
	 * @param {boolean} [cache]
	 * @returns {Promise<*>}
	 */
	async query(query, cache) {
		if (query && query.join) {
			query.include = query.join;
			delete query.join;
		} else if (!query) {
			return {
				error : {
					message : "Cannot call without a query"
				}
			}
		}
		await this.init();

		let cacheKey;
		if (cache === true) {
			cacheKey = this.getCacheKey(query);
			let record = await this.cacheManager.get(cacheKey);
			if (record) {
				return record;
			}
		}

		let obj = Object.assign({}, query);

		await ModelUtils.addJoinFromKeys(this, query, obj);

		let context = this;
		let doQuery = async (offset, results) => {
			results = results || [];
			let query = Object.assign({}, obj);
			let maxLimit = process.env.CORE_REQUEST_LIMIT && !isNaN(parseInt(process.env.CORE_REQUEST_LIMIT)) ? parseInt(process.env.CORE_REQUEST_LIMIT) : 500;
			let originalLimit = !isNaN(obj.limit) ? obj.limit : maxLimit;
			if (!isNaN(obj.limit) && obj.limit >= maxLimit) {
				query.limit = Math.min(obj.limit, maxLimit);
			}
			query.offset = offset;

			let builder = this.builder;
			let {statement} = await builder.select(query);
			let result = await this.execute(statement);

			if (!result.error && result.length > 0) {
				results = results.concat(result);
				if (result.length === query.limit && results.length < originalLimit &&
					process.env.CORE_ABORT_ON_DISCONNECT === "true") {
					if (context.req && context.req.destroyed !== true &&
						process.env.CORE_ABORT_ON_DISCONNECT === "true") {
						console.log("abort query because connection ended");
					} else {
						return doQuery(offset += query.limit, results);
					}
				}
			} else {
				return result;
			}
			return results;
		}

		let results = await doQuery(obj.offset || 0);

		if (this.req &&
			this.req.destroyed === true &&
			process.env.CORE_ABORT_ON_DISCONNECT === "true") {
			return {
				error: {
					message: "Request ended prematurely"
				}
			}
		}

		await this.afterFind(results);

		if (query.include) {
			if (this.req && !this.req.locals.currentResults) {
				this.req.locals.currentResults = results;
			}
			this.log("query::include", query.include);
			if (this.debug || query.debug) {
				Object.keys(query.include).forEach((item) => {
					if (query.include[item] === true) {
						query.include[item] = {};
					}
					query.include[item].debug = true
				});
			}
			await ModelRelations.include(this, results, query);
		}

		if (cacheKey) {
			await this.cacheManager.set(cacheKey, results);
		}

		return results;
	}

	/**
	 *
	 * @param {object} query
	 * @param {boolean} [cache]
	 * @returns {object|Promise}
	 */
	async count(query, cache) {
		await this.init();
		let cacheKey;
		let result;
		let q = query ? {where: Object.assign({}, query.where)} : {where: {}};

		if (Object.keys(q.where).length === 0 && this.primaryKey) {
			q.where[this.primaryKey] = {"!=": null}
		}

		if (cache === true) {
			cacheKey = this.getCacheKey(q, "count");
			result = await this.cacheManager.get(cacheKey);
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

		let builder = this.builder;
		let {statement} = await builder.count(q);
		result = await this.execute(statement);

		if (result && result.error) {
			return result;
		} else if (!result) {
			return {
				error: {
					"message": "Count Failure"
				}
			}
		}

		if (result) {
			if (this.db === "pg" && result[0].count) {
				result = result[0].count;
			} else {
				let key = Object.keys(result[0]);
				result = result[0][key];
			}
			if (cacheKey) {
				await this.cacheManager.set(cacheKey, result, result > 10000 ? 120 : 60);
			}
			this.log("count", result);
			return result;
		} else {
			return 0;
		}
	}

	/**
	 * Psuedo for query
	 * @param {object} query
	 * @param {boolean} [cache]
	 * @returns {Promise<object>}}
	 */
	async find(query, cache) {
		let cacheKey;
		let results;
		if (cache === true) {
			cacheKey = this.getCacheKey(query, "find");
			results = await this.cacheManager.get(cacheKey);
			if (results) {
				return results;
			}
		}
		results = await this.query(query);

		if (results.error) {
			return results;
		}

		if (cacheKey) {
			await this.cacheManager.set(cacheKey, results);
		}

		return results;
	}

	/**
	 * Query to find one record
	 * @param {object} query
	 * @param {boolean} [cache] - cache the result?
	 * @returns {Promise<*>}
	 */
	async findOne(query, cache) {
		query.limit = 1;
		let cacheKey;
		let result;

		if (cache === true) {
			cacheKey = this.getCacheKey(query, "findone");
			result = await this.cacheManager.get(cacheKey);
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
				let r = await this.cacheManager.set(cacheKey, result[0]);
			}

			return this.afterRead(result[0]);
		}

		return null;
	}

	/**
	 * Update one record
	 * @param {string|integer} id
	 * @param {object} data
	 * @param {boolean} [fetch]
	 * @returns {object|Promise}
	 */
	async update(id, data, fetch) {
		this.log("update");
		await this.init();

		if (!id) {
			return {
				error: {
					message: "Update must be called with a valid id"
				}
			}
		}

		let params = await ModelUtils.convertDataTypes(this, data);

		let currentRecord = await this.read(id);

		if (!currentRecord) {
			return {
				error: {
					id: id,
					message: "Record " + id + " does not exist"
				}
			}
		}

		if (this.properties[this.updatedAt]) {
			params[this.updatedAt] = data[this.updatedAt] = now();
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

		if (proceed) {
			let builder = this.builder;
			let {statement} = await builder.update(query, params);
			let result = await this.execute(statement);

			if (result.error) {
				return result;
			}

			await this.afterUpdate(id, params);

			if (this.historyEnabled) {
				let HistoryModel = this.loadModel("HistoryModel");
				let historyModel = new HM(this.req);
				await historyModel.create(
					{
						before: currentRecord,
						after: params,
						model: this
					}
				);
			}

			if (fetch) {
				return _.extend(currentRecord, params);
			}

			//TODO update attached relations

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

	/**
	 * @param {object} query - {where : {foo:bar}}
	 * @param {object} data
	 * @returns {Promise<{error: {data, missing: *, action: string}}|{error}|*|{error: {data, invalid: *, action: string}}>}
	 */
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

		if (query.debug) {
			let count = await this.count(query);
			return {
				result : {
					message : `${count} Records would be affected by this update`,
					query : query,
					statement : this.lastCommand
				}
			}
		}

		let builder = this.builder;
		let {statement} = await builder.update(query, params);
		let result = await this.execute(statement);

		if (result.error) {
			return result;
		}
		return result;
	}

	/**
	 * destroy one record
	 * @param id
	 * @param [isDebug]
	 * @returns {Promise<*>}
	 */
	async destroy(id, isDebug) {
		if (!id) {
			return {
				error : {
					message : "Cannot call destroy without a specific id"
				}

			}
		}
		this.log("destroy", id);
		await this.init();
		let record = await this.read(id);

		if (record) {

			let proceed = await this.beforeDestroy(id, record);

			if (proceed !== false) {
				let query = {};
				if (this.schema.validateProperty(this.primaryKey, id, "destroy") === true) {
					this.addPrimaryKeyToQuery(id, query);
				} else {
					return {
						error: {
							message: "Invalid Primary Key Used for Delete"
						}
					}
				}

				let builder = this.builder;
				let {statement} = await builder.delete(query);

				if (query.debug || isDebug) {
					return {
						error: {
							sql: statement
						}
					}
				}

				let result = await this.execute(statement);
				await this.afterDestroy(id, record);

				//TODO delete attached relations

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
	 * @param {boolean} [isDebug] - test a query before running it
	 * @returns {Promise<*>}
	 */
	async destroyWhere(query, isDebug) {
		await this.init();
		let affectedRows = await this.find({where:query.where}, select[this.primaryKey]);
		if (affectedRows.error) {
			return affectedRows;
		}
		if (isDebug || query.debug || (query.limit && affectedRows.length > query.limit)) {
			return {
				result : {
					message : `${affectedRows.length} Records would be affected by this update`,
					statement : this.lastCommand
				}
			}
		}
		let {statement} = await this.builder.delete({where:query.where});
		let result = this.execute(statement);

		//TODO delete attached relations
	}


	/**
	 * Does a record with the id exist
	 * @param {string|integer} id
	 * @param {boolean} [cache]
	 * @returns {Promise<boolean>}
	 */
	async exists(id, cache) {
		await this.init();
		let query = {
			where: {},
			limit : 1
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
		await this.init();
		let obj = {}
		obj[key] = value;

		if (!await this.exists(id, true)) {
			return null;
		}

		return this.update(
			id,
			{
				[key] : value
			}
		);
	}

	/**
	 * Get the value of a single column from a single row
	 * @param id
	 * @param key
	 * @returns {Promise<*>}
	 */
	async getKey(id, key) {
		await this.init();
		let query = {
			where: {}
		};
		return this.read(id, {select:[key]})
	}


	/**
	 *
	 * @param results
	 * @param query
	 * @returns {Promise<*|*[]>}
	 * @deprecated
	 */
	async join(results, query) {
		await ModelRelations.include(this, results, query)
	}

	async logExecuteError(client, sql) {
		if (!this.debug) {
			return;
		}
		try {

			this.log("execute error", e.message, null, true);
			this.log("execute error", sql, null, true);
			this.log("execute pool counts", "totalCount->" + client.totalCount + " idleCount->" + client.idleCount + " waitingCount->" + client.waitingCount, null, true);

			if (process.env.CORE_AWS_ENABLED) {

				let payload = JSON.stringify(
					{
						endpoint: "operation",
						payload:
							{
								executeError: e.message,
								sql: e.sql,
								counts: "totalCount->" + client.totalCount + " idleCount->" + client.idleCount + " waitingCount->" + client.waitingCount
							}
					}
				);

				let params = {
					Message: payload,
					TopicArn: process.env.SNS_NOTIFICATION_ARN
				};

				let result = new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise().then(() => {
				});
			}

		} catch (e) {

		}
		return true;
	}

	/**
	 * Call the DB with query!!!
	 * @param {builder | string } command
	 * @param {object} [client]
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

		if (this.debug) {
			this.log("execute", sql);
		}

		this.lastCommand = command;

		let startTime = new Date().getTime();

		if (sql.toLowerCase().indexOf("select") === 0) {
			client = client || await this.getClient("read");
			let results;
			try {
				results = await client.query(sql);
			} catch (e) {
				e.sql = sql;
				await this.logExecuteError(client, sql);
				this.lastError = e;

				this.addError(
					{
						message: e.message,
						sql: sql
					}
				);

				return {
					error: {
						message: e.message,
						sql: sql
					}
				};
			}

			await this.releaseClient(client);

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

			this.log("execute", "query time " + (new Date().getTime() - startTime));
			this.addMetric(sql, new Date().getTime() - startTime)

			return results;

		} else {
			if (process.env.CORE_READ_ONLY === "true") {
				this.log("execute", "Updating disabled by env CORE_READ_ONLY")
				return {}
			}
			client = client || await this.getClient("write");
			let results = {
				error: {
					message: "Nothing Happened"
				}
			};
			try {
				results = await client.query(sql);
			} catch (e) {

				await this.logExecuteError(client, sql);

				this.lastError = e;

				e.sql = sql;

				this.addError(
					{
						message: e.message,
						sql: sql
					}
				);

				return {
					error: {
						message: e.message,
						sql: sql
					}
				};
			}

			await this.releaseClient(client);
			this.addMetric(sql, new Date().getTime() - startTime)

			switch (this.db) {
				case "mssql" :
					results = results.recordset;
					break;
				case "mysql" :
					if (results.insertId > 0) { //mySQL //TODO what is pg/mssql?
						results = {
							[this.primaryKey]: results.insertId
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
	 * @deprecated
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
		return data;
	}

	/**
	 * Before updating a record, you may wish to modify the data, or check permissions
	 * @param id
	 * @param data
	 * @returns {Promise<boolean>}
	 */
	async beforeUpdate(id, data) {
		return data;
	}

	/**
	 * After the record has been created, you might want to do some additional work,
	 * like kick the record out to elastic search, or call some webhook
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async afterUpdate(id, data) {
		return data;
	}

	/**
	 * Before a record is destroyed, you might want to check permissions or run some process that if
	 * it fails, you wouldn't want to remove the record at this time.
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async beforeDestroy(id, data) {
		return data;
	}

	/**
	 * Now that record is gone, maybe you want to move it to some log file, or history table
	 * @param id
	 * @param data
	 * @returns {Promise<void>}
	 */
	async afterDestroy(id, data) {
		return data;
	}

	/**
	 * Recurses results to map objects to
	 * @param data
	 * @returns {Promise<*>}
	 */
	async afterFind(data) {
		if (this.afterQuery) {
			return await this.afterQuery(data)
		}
	}

	/**
	 * Override as needed to set the updatedAt column (if this table even has one). If this is complex, consider using beforeUpdate
	 * @returns {string | null}
	 */
	get updatedAt() {
		if (this.properties.hasOwnProperty("updatedAt")) {
			return "updatedAt";
		}
		return null;
	}

	/**
	 * Override as needed to set the createdAt column (if this table even has one). If this is complex, consider using beforeCreate
	 * @returns {string | null}
	 */
	get createdAt() {
		if (this.properties.hasOwnProperty("createdAt")) {
			return "createdAt";
		}
		return null;
	}

	/**
	 * Use when foreign keys are show in the datatable, so instead of an id, you can show the name in the other table
	 * @returns {string | null}
	 */
	get name() {
		if (this.properties.hasOwnProperty("name")) {
			return "name";
		}
		return null;
	}

	/**
	 * Helper method to load a model by name
	 * @param modelName
	 * @returns {ModelBase}
	 */
	loadModel(modelName) {
		if (typeof modelName !== "string") {
			return modelName;
		}
		return getModel(modelName);
	}

	log(method, message, id, level, force) {
		if (this.debug || force) {
			level = level || "warn";
			if (message && typeof message === "object") {
				message = beautify(message);
			}
			//Show as error for stack tracing
			console[level](this.tableName + (method ? "::" + method : "") + (message ? " -> " + message : ""));

			if (process.env.CORE_LOGGING === "true") {
				if (this.req && this.req.locals.isAdmin) {
					if (!['create', 'update', 'destroy', 'destroyWhere'].includes(method)) {
						return;
					}
				}
				let LogModel = require("./LogModel");
				let lm = new LogModel(this.req);
				if (this.pool) {
					lm.pool = this.pool;
				}
				lm.create(
					{
						objectId: id ? id : null,
						objectType: this.tableName,
						message: message,
						method: method,
						status: "active"
					}
				).then((result) => {

				});
			}
		}
	}

	addMetric(request, time) {
		if (this.req && this.req.locals.metrics) {
			this.req.locals.metrics[this.tableName] = this.req.locals.metrics[this.tableName] || [];
			this.req.locals.metrics[this.tableName].push(
				{
					request: request,
					time: time
				}
			)
		}
	}

	addError(error) {
		let e = {
			model: this.tableName,
			sql: this.lastCommand.toString(),
			error: error
		};
		if (this.req) {
			this.req.locals.errors = this.req.locals.error || [];
			this.req.locals.errors.push(e)
		}
	}

}

module.exports = ModelBase;
