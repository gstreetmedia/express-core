let util = require("util");
let JSONSchema = require("../model/objects/JsonSchema");
let inflectFromTable = require("../helper/inflect-from-table");

class ElasticSchema {

	constructor(connectionString) {
		this.connectionString = connectionString;
	}

	/**
	 * @returns {EsApiClient}
	 */
	async getPool(action) {
		return await require("../model/model-base/pool-mongo")(this.connectionString);
	}

	async getTables() {
		let client = await this.getPool()
		let result = await client.listCollections().toArray();
		console.log(result);
		let tables = [];
		result.forEach(
			(item) => {
				tables.push(item.name);
			}
		)
		return tables
	}

	async getMappings(tableName) {
		let client = await this.getPool()
		let results = await client.collection(tableName).find().limit(10);
		results = await results.toArray();
		console.log(results);
		let structure = {};

		results.forEach(
			(item) => {
				let keys = Object.keys(item);
				let format = (key, targetObj) => {
					let obj = {
						type : null
					};
					switch (typeof targetObj[key]) {
						case "number" :
							obj.type = "number";
							if (targetObj[key]%1) {
								obj.format = "decimal"
							}
							obj.format = "integer";
							break;
						case "boolean" :
							obj.type = "boolean";
							break;
						case "object" :
							if (targetObj[key] instanceof Array) {
								obj.type = "array";
							} else {
								obj.type = "nested";
								let keys = Object.keys(targetObj[key]);
								obj.properties = {};
								keys.forEach(
									(k) => {
										obj.properties[k] = format(key, targetObj[key][k]);
									}
								)
							}
							break;
						default :
							obj.type = "string";
							//TODO UUID, Date, DateTime, Poly, Geo
							break;
					}
					return obj;
				}
				keys.forEach(
					(key) => {
						structure[key] = format(key, item);
					}
				)
			}
		)
		return structure;
	}

	async getSchema(tableName) {
		let map = await this.getMappings(tableName);
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
				let prop = inflectFromTable.propertyName(key);
				properties[prop] = format(key, map[key]);
			}
		);

		this.schema = new JSONSchema({
			tableName : tableName,
			baseName : tableName,
			properties : properties,
			required : ["id"]
		});

		return this.schema;
	}


	/**
	 * @param {JSONSchema} schema
	 * @returns {Promise<void>}
	 */
	async schemaToMapping(tableName) {
		let SchemaModel = require("../model/SchemaModel");
		let sm = new SchemaModel();
		await sm.init();
		let schema = await sm.get(tableName);
		let key = Object.keys(schema.properties);
		let mapping = {};
		let format = (properties, targetObj) => {
			let keys = Object.keys(properties);
			keys.forEach(
				(key) => {
					let obj = {
						type : null,
						//originalType : properties[key].type,
						//originalFormat : properties[key].format
					}
					let type = (property) => {
						switch (property.type) {

							case "number" :
								switch (property.format) {
									case "integer" :
										return "integer"
									default :
										return "double"
								}
							case "boolean" :
								return "boolean";
							case "object" :
								return "nested";
							case "array" :
								return type(property.format);
							default :
								switch (property.format) {
									case "date" :
									case "date-time" :
										return "date";
									default :
										if (property.maxLength > 32) {
											return "text";
										}
										return "keyword"
								}


						}
					}
					obj.type = type(properties[key]);
					if (obj.type === "nested") {
						format(properties[key].properties, obj);
					}
					if (obj.type === "keyword") {
						obj.normalizer = "lowercase_normalizer";
						obj.fields = {
							suggest : {
								type : "completion"
							}
						}
					}
					targetObj[properties[key].columnName ? properties[key].columnName : key] = obj;
				}
			)
			return targetObj;
		}

		return {
			mappings : {
				properties : format(schema.properties, {})
			},
			settings: {
				analysis: {
					"normalizer": {
						"lowercase_normalizer": {
							"type": "custom",
							"char_filter": [],
							"filter": [
								"lowercase"
							]
						}
					}
				}
			}
		}
	}
}

module.exports = ElasticSchema;
