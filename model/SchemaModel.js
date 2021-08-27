const ModelBase = require('./ModelBase');
const JsonSchema = require("./objects/JsonSchema");
const _ = require('lodash');
const inflector = require("../helper/inflector");
const fs = require("fs");
const path = require("path");
const exists = require("util").promisify(fs.exists);
const readFile = require("util").promisify(fs.readFile);
const inflectFromTable = require("../helper/inflect-from-table");
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

	async update(id, data) {
		console.log("udpate " + id);
		data.status = data.status || "active";
		let result = await super.update(id, data, true);
		if (!result.error) {
			global.schemaCache[result.tableName] = new JsonSchema(result);
			await this.saveFile(result.tableName, result);
		} else {
			console.log(result);
		}
		return result;
	}

	async create(data) {
		console.log("create " + data.tableName);
		data.status = data.status || "active";
		let result = await super.create(data, true);
		if (!result.error) {
			global.schemaCache[result.tableName] = new JsonSchema(result);
			await this.saveFile(result.tableName, result);
		} else {
			//console.log(result);
			console.log(this.lastCommand.toString());
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
		if (global.schemaCache[this.tableName]) {
			return global.schemaCache[this.tableName];
		}
		this._schema = await this.get(this.tableName); //Need a primer
		let schema = await this.findOne({
			where : {
				tableName : this.tableName
			}
		});
		if (schema && schema.id) {
			hasSchemaTable = true;
			this._schema = global.schemaCache[this.tableName] = new JsonSchema(schema);
		} else {
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
	async get(tableName, fromCache) {
		if (fromCache !== false) {
			if (global.schemaCache[tableName]) {
				return global.schemaCache[tableName];
			}
		}
		if (hasSchemaTable) {
			this.log("get [db]", tableName);
			let schema = await this.findOne(
				{
					where : {
						tableName : tableName
					}
				}
			)
			if (schema && schema.id) {
				schema = new JsonSchema(schema);
				global.schemaCache[tableName] = schema;
				if (schema.relations) {
					global.relationCache[tableName] = schema.relations;
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
			if (table && table.id) {
				return await this.update(table.id, data, true);
			} else {
				return await this.create(data, true);
			}
		} else {
			this.saveFile(tableName, data);
		}

	}

	async createTable() {
		//TODO need to do this for mssql and mysql as well
		await this.execute(
			`create table if not exists _schemas
             (
                 id          uuid        not null
                     constraint schemas_pkey
                         primary key,
                 data_source varchar(64),
                 title       varchar(255),
                 table_name  varchar(64) not null,
                 primary_key varchar(64)              default 'id'::character varying,
                 properties  jsonb       not null,
                 required    varchar(64)[],
                 read_only   varchar(64)[],
                 created_at  timestamp with time zone default now(),
                 updated_at  timestamp with time zone default now()
             );

            create unique index if not exists schemas_id_uindex
                on _schemas (id);

            create unique index if not exists schemas_table_name_uindex
                on _schemas (table_name);
			`
		)
	}

	/**
	 * @returns {JsonSchema}
	 */
	async loadFile(tableName) {
		this.log("loadFile", tableName);
		let schema;
		let fileName = this.getLocalFileName(tableName);
		let p = path.resolve(__dirname + "/../../schema/" + fileName);
		if (await exists(p)) {
			this.log("loadFile", p);
			schema = require(p.split(".js").join(""));
		} else {
			this.log("No Schema @ " + p);
		}
		if (!schema) {
			p = path.resolve(__dirname + "/../schema/" + fileName);
			if (await exists(p)) {
				this.log("loadFile", p);
				schema = require(p.split(".js").join(""));
			}
			if (!schema) {
				this.log("loadFile", "No schema @ " + p);
			}
		}
		if (!schema) {
			console.error("Could Not Load Schema for " + tableName);
			return null;
		}
		schema = new JsonSchema(schema);
		global.schemaCache[schema.tableName] = schema;
		return schema;
	}

	/**
	 * @returns {array[JsonSchema]}
	 */
	async loadAll() {
		let schemas = [];
		if (hasSchemaTable) {
			schemas = await this.find({sort:"title ASC"});
			schemas.forEach(
				(schema) => {
					schema = new JsonSchema(schema);
					global.schemaCache[schema.tableName] = schema;
				}
			)
		} else {
			let files = fs.readdirSync(global.appRoot + '/src/schema');

			files.forEach(
				(file) => {
					if (file.indexOf(".js") === -1) {
						return;
					}
					let p = path.resolve(__dirname + "/../../schema/" + file);
					let schema = require(p);
					schema = new JsonSchema(schema);
					schemas.push(schema);

					global.schemaCache[schema.tableName] = schema;
				}
			)
		}
		return schemas;
	}

	getLocalFileName(tableName) {
		this.log("getLocalFileName", tableName)
		let file = inflector.dasherize(tableName.toLowerCase()) + "-schema.js";
		if (file.indexOf("-") === 0) {
			file = "_" + file.substring(1, file.length)
		}
		return file;
	}

	saveFile(tableName, data) {
		this.log("saveFile", tableName)
		let p = path.resolve(__dirname + "/../../schema/" + this.getLocalFileName(tableName));
		let template = require("../task/templates/schema");
		fs.writeFileSync(p, template(data));
	}


}

module.exports = SchemaModel;
