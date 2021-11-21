const ModelBase = require('./ModelBase');
const JsonSchema = require("./objects/JsonSchema");
const _ = require('lodash');
const inflector = require("../helper/inflector");
const fs = require("fs");
const path = require("path");
const exists = require("util").promisify(fs.exists);
const readFile = require("util").promisify(fs.readFile);
const inflectFromTable = require("../helper/inflect-from-table");
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

	async update(id, data) {
		console.log("update");
		let result = await super.update(id, data, true);
		if (!result.error) {
			let schema = new JsonSchema(result);
			global.schemaCache[result.tableName] = schema;
			if (schema.relations) {
				global.relationCache[result.tableName] = result.relations;
			}
			if (schema.foreignKeys) {
				global.foreignKeyCache[result.tableName] = result.foreignKeys;
			}
			await this.saveFile(result.tableName, result);
		}
		return result;
	}

	async create(data) {
		console.log("create");
		let result = await super.create(data, true);
		if (!result.error) {
			let schema = new JsonSchema(result);
			global.schemaCache[data.tableName] = schema;
			if (schema.relations) {
				global.relationCache[data.tableName] = data.relations;
			}
			if (schema.foreignKeys) {
				global.foreignKeyCache[data.tableName] = data.foreignKeys;
			}
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
		if (global.schemaCache[SchemaModel.tableName]) {
			return global.schemaCache[SchemaModel.tableName];
		}

		this._schema = await this.get(this.tableName);

		let schema = await this.findOne({
			where : {
				tableName : this.tableName
			}
		});

		if (!schema.error) {
			hasSchemaTable = true;
			this._schema = global.schemaCache[SchemaModel.tableName] = new JsonSchema(schema);
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
			console.log("set 1");
			let table = await this.get(tableName, false);
			if (table) {
				return await this.update(table.id, data, true);
			} else {
				return await this.create(data);
			}
		} else {
			console.log("set 2");
			return this.saveFile(tableName, data);
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
		let p = path.resolve(global.appRoot + "/src/schema/" + this.getLocalFileName(tableName));
		console.log(p);
		if (await exists(p)) {
			this.log("loadFile", p);
			schema = require(p.split(".js").join(""));
		}
		if (!schema) {
			p = path.resolve(__dirname + "/../schema/" + this.getLocalFileName(tableName));
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

		schema.relations = await getRelations(tableName);
		schema.foreignKeys = await getForeignKeys(tableName);
		schema = new JsonSchema(schema);
		global.schemaCache[schema.tableName] = schema;
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
					global.schemaCache[schema.tableName] = schema;
					if (schema.relations) {
						global.relationCache[schema.tableName] = schema.relations;
					}
					if (schema.foreignKeys) {
						global.foreignKeyCache[schema.tableName] = schema.foreignKeys;
					}
				}
			)
		} else {
			let files = fs.readdirSync(global.appRoot + '/src/schema');

			files.forEach(
				(file) => {
					if (file.indexOf(".js") === -1) {
						return;
					}
					let p = path.resolve(global.appRoot + "/src/schema/" + file);
					let schema = require(p);
					schema = new JsonSchema(schema);
					global.schemaCache[schema.tableName] = schema;
					if (schema.relations) {
						global.relationCache[schema.tableName] = schema.relations;
					}
					if (schema.foreignKeys) {
						global.foreignKeyCache[schema.tableName] = schema.foreignKeys;
					}
					schemas.push(schema);
				}
			)
		}
		return schemas;
	}

	getLocalFileName(tableName, type) {
		type = type || "schema"
		let file = inflector.dasherize(tableName.toLowerCase()) + `-${type}.js`;
		if (file.indexOf("-") === 0) {
			file = "_" + file.substring(1, file.length)
		}
		return file;
	}

	saveFile(tableName, data) {
		let p = path.resolve(global.appRoot + "/src/schema/" + this.getLocalFileName(tableName));
		let template = require("../task/templates/schema");
		fs.writeFileSync(p, template(data));
		if (data.relations || data.foreignKeys) {
			let template = require("../task/templates/relations");
			let p = path.resolve(global.appRoot + "/src/schema/relations/" + this.getLocalFileName(tableName, "relations"));
			fs.writeFileSync(p, template(data));
		}
		return data;
	}


}

module.exports = SchemaModel;
