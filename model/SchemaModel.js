const ModelBase = require('./ModelBase');
const JsonSchema = require("../object/JsonSchema");
const _ = require('lodash');
const inflector = require("../helper/inflector");
const fs = require("fs");
const path = require("path");
const exists = require("util").promisify(fs.exists);
const readFile = require("util").promisify(fs.readFile);
const getRelations = require("../helper/get-relations");
const getForeignKeys = require("../helper/get-foreign-keys");

global.schemaCache = {};
global.relationCache = {};
global.foreignKeyCache = {};
let hasSchemaTable = false;

class SchemaModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return "_schemas";
	}

	get dataSource() {
		return "DEFAULT_DB";
	}

	get name() {
		return 'tableName'
	}

	async update(id, data, fetch) {
		let result = await super.update(id, data, true);
		if (!result.error) {
			let schema = new JsonSchema(result);
			global.schemaCache[result.tableName] = schema;
			await this.saveFile(result.tableName, result);
		}
		return result;
	}

	async create(data) {
		let result = await super.create(data, true);
		if (!result.error) {
			let schema = new JsonSchema(result);
			global.schemaCache[data.tableName] = schema;
			await this.saveFile(data.tableName, result);
		}
		return result;
	}

	/**
	 * @returns {JsonSchema}
	 */
	async getSchema() {

		if (this.schema) {
			return this.schema;
		}

		this.schema = await this.get(this.tableName);

		let schema = await this.findOne({
			where : {
				tableName : this.tableName
			}
		});

		if (!schema.error) {
			hasSchemaTable = true;
			this.schema = global.schemaCache[SchemaModel.tableName] = new JsonSchema(schema);
		} else {
			console.log(schema);
			hasSchemaTable = false;
		}

		return this.schema;
	}

	async query(query) {
		query.sort = "title ASC";
		return await super.query(query);
	}

	async loadSchemas(connectionStrings) {

	}

	/**
	 * @returns {JsonSchema}
	 */
	async get(tableName, dataSource, fromCache) {
		if (fromCache !== false && global.schemaCache[tableName]) {
			return global.schemaCache[tableName];
		}
		if (hasSchemaTable && process.env.CORE_SCHEMA_SOURCE !== "local") {
			this.log("get [db]", tableName);
			let schema = await this.findOne(
				{
					where : {
						tableName : tableName
					}
				}
			)
			if (schema && !schema.error) {
				schema = new JsonSchema(schema);
				global.schemaCache[tableName] = schema;
				if (schema.relations) {
					global.relationCache[tableName] = schema.relations;
				} else {
					await getRelations(tableName)
				}
				if (schema.foreignKeys) {
					global.foreignKeyCache[tableName] = schema.foreignKeys;
				}
				return schema;
			}
		}

		return await this.loadFile(tableName);
	}

	async set(tableName, data) {
		if (hasSchemaTable) {
			let table = await this.get(tableName, false);
			if (table && table.id) { //No id means it likely came from the file system
				return await this.update(table.id, data, true);
			} else {
				return await this.create(data);
			}
		} else {
			console.log("set 2");
			return this.saveFile(tableName, data);
		}
	}

	/**
	 * @returns {JsonSchema}
	 */
	async loadFile(tableName, dataSource) {
		this.log("loadFile", tableName);
		let schema;

		let paths = [
			path.resolve(global.appRoot + "/src/schema/" + dataSource + "/" + this.getLocalFileName(tableName) + ".json"),
			path.resolve(global.appRoot + "/src/schema/" + this.getLocalFileName(tableName) + ".js"),
			path.resolve(__dirname + "/../schema/" + this.getLocalFileName(tableName) + ".js"),
			path.resolve(__dirname + "/../schema/" + this.getLocalFileName(tableName) + ".json")
		];

		let extension;
		while (paths.length > 0) {
			if (await exists(paths[0])) {
				extension = paths[0].split('.');
				extension = extension[extension.length-1];
				this.log("loadFile", paths[0]);
				if (extension === "js") {
					schema = require(paths[0].split(".js").join(""));
				} else if (extension === "json") {
					let s = fs.readFileSync(paths[0])
					schema = JSON.parse(s);
				}

				break;
			}
			paths.shift()
		}

		if (!schema) {
			this.log("Could Not Load Schema for " + tableName);
			return null;
		}

		schema.relations = schema.relations || await getRelations(tableName, dataSource);
		schema.foreignKeys = schema.foreignKeys || await getForeignKeys(tableName, dataSource);
		schema = new JsonSchema(schema);
		global.schemaCache[schema.tableName] = schema;
		if (hasSchemaTable) {
			let result = await super.create(schema.toJSON());
			console.log(result);
		}
		return schema;
	}

	/**
	 * @returns {array[JsonSchema]}
	 */
	async loadAll() {
		let schemas = [];
		if (hasSchemaTable && process.env.CORE_SCHEMA_SOURCE !== "local") {
			schemas = await this.find({sort:"title ASC"});
			schemas.forEach(
				(schema) => {
					schema = new JsonSchema(schema);
					global.schemaCache[schema.dataSource + "_" + schema.tableName] = schema;
				}
			)
		} else {

			let load = (path) => {
				let files = fs.readdirSync(path);
				files.forEach(
					(file) => {
						if (fs.lstatSync(path + "/" + file).isDirectory()) {
							return load(path + "/" + file)
						}
						let schema;
						if (file.indexOf(".json")) {
							schema = fs.readFileSync(p);
							schema = JSON.parse(schema);
						} else {
							schema = require(p);
						}

						schema = new JsonSchema(schema);
						global.schemaCache[schema.dataSource + "_" + schema.tableName] = schema;
						schemas.push(schema);
					}
				)
			}

			load(path.resolve(global.appRoot + "/src/schema/"));

		}
		return schemas;
	}

	getLocalFileName(tableName, type) {
		type = type || "schema"
		let file = inflector.dasherize(tableName.toLowerCase()) + `-${type}`;
		if (file.indexOf("-") === 0) {
			file = "_" + file.substring(1, file.length)
		}
		return file;
	}

	saveFile(tableName, data) {
		let p = path.resolve(global.appRoot + '/src/schema/' + data.dataSource);
		if (!fs.existsSync(p)) {
			fs.mkdirSync(p)
		}
		fs.writeFileSync(
			path.resolve(p + "/" + schema.tableName + ".json"), beautify(data, null, 4, 100))
		return data;
	}

	getTables() {
		let tables = [];
		Object.key(global.schemaCache).forEach(
			(key) => {
				tables.push(global.schemaCache[key].tableName)
			}
		)
		return tables;
	}

	log(method, message, id, forceLogging) {
		if (this.debug || forceLogging) {
			if (message && typeof message === "object") {
				message = JSON.stringify(message);
			}
			//Show as error for stack tracing
			console.error(this.tableName + (method ? "::" + method : "") + (message ? " -> " + message : ""));
		}
	}

}

module.exports = SchemaModel;
