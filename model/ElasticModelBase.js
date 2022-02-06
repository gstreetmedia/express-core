let fs = require("fs");
let _ = require("lodash");
let ModelBase = require("./ModelBase")
let cp = require("../helper/connection-string-parser");
let util = require("util");
let JsonSchema = require("./objects/JsonSchema");
let inflectFromTable = require("../helper/inflect-from-table");
const cacheManager = require("../helper/cache-manager");
const ModelUtils = require("./model-base/ModelUtils");
const ModelRelations = require("./model-base/ModelRelations");

class ElasticModel extends ModelBase{

	/**
	 * @returns {EsApiClient}
	 */
	async getPool(action) {
		let cs = this.connectionString();
		if (util.types.isAsyncFunction(this.connectionString)) {
			cs = await this.connectionString();
		}
		return await require("./model-base/pool-elastic")(cs);
	}

	async getMappings() {
		let client = await this.getPool();
		let result = await client.indices.getMapping(
			{
				index: this.tableName
			}
		);
		return result[Object.keys(result)[0]].mappings.properties;
	}

	get primaryKey() {
		return "id";
	}
	/**
	 * @returns {JsonSchema}
	 */
	async getSchema() {
		if (!this._schema) {
			let map = await this.getMappings();
			let properties = {};
			let format = (key, sourceObj) => {
				let obj;
				switch (sourceObj.type) {
					case "keyword" :
					case "text" :
						obj = {
							type : "string",
							columnName : key
						}
						break;
					case "date" :
						obj = {
							type : "string",
							format : "date",
							columnName : key
						}
						break;
					case "integer" :
					case "long" :
						obj = {
							type : "number",
							format : "integer",
							columnName : key
						}
						break;
					case "double" :
						obj = {
							type : "number",
							format : "decimal",
							columnName : key
						}
						break;
					case "geo_point" :
						obj = {
							type : "object",
							format : "geoJson",
							columnName : key
						}
						break;
					case "object" :
						obj = {
							type : "object",
							columnName : key
						}
						break;
					case "boolean" :
						obj = {
							type : "boolean",
							columnName : key
						}
						break;

					default :
						if (sourceObj.properties) {
							let properties = {};
							Object.keys(sourceObj.properties).forEach(
								(innerKey) => {
									properties[innerKey] = format(innerKey, sourceObj.properties[innerKey])
								}
							);
							obj = {
								type : "object",
								format : "nested",
								properties : properties,
								columnName : key
							}
						}

				}

				return obj;
			}
			Object.keys(map).forEach(
				(key) => {
					properties[key] = format(key, map[key]);
				}
			);
			this.schema = global.schemaCache[this.tableName] = new JsonSchema({
				tableName : this.tableName,
				baseName : this.tableName,
				properties : properties,
				required : ["id"]
			});
		}
		return this.schema;
	}

	get queryBuilder() {
		if (this._builder) {
			return this._builder;
		}
		console.log(this.tableName);
		let QueryBuilder = require("./model-base/QueryToElastic");

		this._builder = new QueryBuilder(this);
		return this._builder;
	}

	/**
	 *
	 * @param data
	 * @returns {Promise<{error: *}|*>}
	 */
	async create(data) {
		await this.init();
		let client = await this.getPool();
		let result;
		try {
			result = await client.update(
				{
					index: this.tableName,
					id: id,
					body: {
						doc : data,
						doc_as_upsert: true
					}

				}
			);
			return result;
		} catch (e) {
			console.log(e);
			return {error:e}
		}
	}


	/**
	 *
	 * @param id
	 * @param type - eg lisings, agents, offices
	 * @param source
	 * @returns {Promise<null|{error: *}|*>}
	 */
	async read(id,  query, cache) {
		await this.init();
		let cacheKey
		if (cache === true) {
			cacheKey = this.getCacheKey(query, id);
			let record = await cacheManager.get(cacheKey);
			if (record) {
				return record;
			}
		}
		let client = await this.getPool();
		let result;
		let obj = {
			index: this.tableName,
			id: id
		};

		if (query.select) {
			obj._source = query.select;
		}

		try {
			result = await client.get(obj);
			if (result._source) {
				if (cacheKey) {
					await cacheManager.set(cacheKey, result._source);
				}
				return result._source;
			} else {
				return null;
			}
		} catch (e) {
			return {error:e}
		}
	}

	/**
	 * @param id
	 * @param data
	 * @param type - eg lisings, agents, offices
	 * @returns {Promise<*|{error}|{error: *}>}
	 */
	async upsert(data) {
		await this.init();
		let client = await this.getPool();
		let start = new Date();

		let obj = {
			index: this.tableName,
			id : id,
			realtime : true
		};

		let exists = await client.exists(obj);
		if (!exists) {
			let result = await this.create(id, data, type);
			return result;
		} else {
			let result = await this.update(id, data, type);
			//console.log(new Date().getTime() - start.getTime());
			return result
		}
	}



	/**
	 *
	 * @param query
	 * @param type
	 * @param type - eg lisings, agents, offices
	 * @returns {Promise<CloudSearchDomain.Hits>}
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

		if (query && query.join && (_.isArray(query.select) && query.length > 0)) {
			await ModelUtils.addJoinFromKeys(this, query, obj);
		}

		let command = this.queryBuilder.select(query);
		let results = await this.execute(command);

		if (this.req && this.req.locals.isConnected === false) {
			return {
				error : {
					message : "Request ended prematurely"
				}
			}
		}

		await this.afterFind(results);

		if (query.join) {
			this.log("query", query.join);
			if (this.req && !this.req.locals.currentResults) {
				this.req.locals.currentResults = results;
			}
			results = await ModelRelations.join(this, results, query);
		} else {
			this.log("query", "no join");
		}

		if (cacheKey) {
			await cacheManager.set(cacheKey, results);
		}

		return results;
	}

	async find(query, cache) {
		return super.query(query, cache);
	}

	async findOne(query, cache) {
		return super.findOne(query, cache);
	}

	async updateWhere(query) {
		return super.updateWhere(query);
	}

	/**
	 *
	 * @param id
	 * @param data
	 * @param type - eg lisings, agents, offices
	 * @returns {Promise<{error: *}|*>}
	 */
	async update(id, data) {
		return super.update(id, data);
	}

	/**
	 * @param id
	 * @param type - eg lisings, agents, offices
	 * @returns {Promise<{}|{error: *}|*>}
	 */
	async destroy(id) {
		await this.init();
		let result;
		let client = await this.getPool();
		try {
			result = await client.delete(
				{
					index: this.tableName,
					id: id,
				}
			);
			return result;
		} catch (e) {
			if (e.statusCode === 404) {
				return {};
			}
			console.log(e);
			return {error:e}
		}
	}

	async bulk(rows) {
		let context = this;
		let bulkList = [];
		let maxRows = 1000;
		rows.forEach(
			function (row) {
				bulkList.push(
					{
						update: {
							_index: context.indexForObject(type),
							//_type: type,
							_id: row.id
						}
					}
				);
				bulkList.push(
					{
						doc: row
					}
				);
			}
		);

		while(bulkList.length > 0) {
			let list = [];

			for (let i = 0; i < Math.min(maxRows, bulkList.length); i++) {
				list.push(bulkList.shift());
			}

			let fs = require("fs");
			fs.writeFileSync(__dirname + "/../../data/last-bulk.json", JSON.stringify(list));

			await this.client.bulk(
				{
					body: list
				}
			);

			console.log("bulk to go " + bulkList.length);
		}
	}

	async bulkDelete(rows) {
		let context = this;
		let bulkList = [];
		let maxRows = 1000;
		rows.forEach(
			function (row) {
				bulkList.push(
					{
						delete: {
							_index: context.indexForObject(type),
							//_type: type,
							_id: row
						}
					}
				);
			}
		);

		while(bulkList.length > 0) {
			let list = [];

			for (let i = 0; i < Math.min(maxRows, bulkList.length); i++) {
				list.push(bulkList.shift());
			}

			let fs = require("fs");
			fs.writeFileSync(__dirname + "/../../data/last-bulk.json", JSON.stringify(list));

			await this.client.bulk(
				{
					body: list
				}
			);

			console.log("bulk to go " + bulkList.length);
		}
	}

	async execute(command) {
		let client = await this.getPool();
		if (this.debug) {
			console.log(JSON.stringify(command));
		}

		if (command.action === "select") {
			console.log("select");
			let response;
			let obj = {
				index: this.tableName,
				size: Math.min(command.body.size, 2000),
				body: {query : command.body.query, _source : command.body._source }
			};
			if (command.body.size > 2000) {
				obj.scroll = '2m';
			}
			if (command.body.from > 0) {
				obj.from = command.body.from;
			}

			try {
				response = await client.search(obj);
			} catch (e) {
				return {
					error : {
						message : e.message
					}
				}
			}
			let rows = _.map(response.hits.hits, "_source");
			if (rows.length < obj.size) {
				return rows;
			}

			if (obj.scroll && rows.length < command.body.size) {
				let scrollId = response._scroll_id;

				while(scrollId) {
					response = await client.scroll(
						{
							scrollId: scrollId,
							scroll: '2m'
						}
					);
					scrollId = response._scroll_id;
					rows = rows.concat(_.map(response.hits.hits, "_source"));

					if (rows.length >= command.body.size || response.hits.hits < 2000) {
						scrollId = null;
					}

					if (this.req && this.req.locals.isConnected === false) {
						scrollId = null;
						return {
							error : {
								message : "Request ended prematurely"
							}
						}
					}
					console.log(rows.length);
				}
			}

			return rows;
		} else if (command.action === "update") {
			let result = await client.index(
				{
					index: this.tableName,
					id: command.data[this.primaryKey],
					body: data,

				}
			);
		} else if (command.action === "insert") {
			let result = client.create(
				{
					index: this.tableName,
					id: command.data[this.primaryKey],
					body : command.data
				}
			);
		} else if (command.action === "count") {

		} else if (command.action === "delete") {
			let result = client.delete(
				{
					index: this.tableName,
					id: command.data[this.primaryKey],
				}
			);
		} else if (command.action === "destroyWhere") {

		}
	}


}

module.exports = ElasticModel;
