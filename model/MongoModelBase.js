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

class MongoModelBase extends ModelBase{

	/**
	 * @param action
	 * @returns {Promise<MongoClient>}
	 */
	async getPool(action) {
		let cs = this.connectionString();
		if (util.types.isAsyncFunction(this.connectionString)) {
			cs = await this.connectionString();
		}
		return await require("./model-base/pool-mongo")(cs);
	}

	get primaryKey() {
		return "id";
	}

	get queryBuilder() {
		if (this._builder) {
			return this._builder;
		}
		console.log(this.tableName);
		let QueryBuilder = require("./model-base/QueryToMongo");

		this._builder = new QueryBuilder(this);
		return this._builder;
	}


	async execute(command) {
		let collection = await this.getPool().collection(this.tableName);
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
				response = await collection.find(obj);
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
			let result = await collection.updateOne(
				command.data
			);
		} else if (command.action === "updateWhere") {
			let result = await collection.updateMany(
				command.data
			);
		} else if (command.action === "insert") {
			let result = await collection.insertOne(
				command.data
			);
		} else if (command.action === "count") {

		} else if (command.action === "delete") {
			let result = client.deleteOne(
				command.data
			);
		}  else if (command.action === "destroyWhere") {
			let result = client.deleteOne(
				command.query,
				command.data
			);
		}
	}


}

module.exports = ElasticModel;
