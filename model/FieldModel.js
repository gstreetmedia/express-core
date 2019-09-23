const ModelBase = require('./ModelBase');
const _ = require('lodash');
const inflector = require("../helper/inflector");
const schema = require('../schema/fields-schema');
const fields = require('../schema/fields/fields-fields');
const cache = require("../helper/cache-manager");
const md5 = require("md5");
const connectionStringParser = require("../helper/connection-string-parser");
const fs = require("fs");
const knex = require("knex");


module.exports = class FieldModel extends ModelBase {

	constructor(req) {
		super(req);
		this.tableExists = null;
	}

	get connectionString() {
		return process.env.DEFAULT_DB;
	}

	get tableName() {
		return FieldModel.tableName;
	}

	static get tableName() {
		return "_fields";
	}

	static get schema() {
		if (global.schemaCache && global.schemaCache[FieldModel.tableName]) {
			return global.schemaCache[FieldModel.tableName]
		}
		return require('../schema/fields-schema');
	}

	static get fields() {
		if (global.fieldCache && global.fieldCache[FieldModel.tableName]) {
			return global.fieldCache[FieldModel.tableName];
		}
		return require('../schema/fields/fields-fields');
	}

	get schema() {
		return FieldModel.schema;
	}

	get fields() {
		return FieldModel.fields;
	}

	async index(query) {
		query.sort = "title ASC";
		return await super.index(query);
	}

	async create(data) {
		return await super.create(data);
	}

	async read(id, query) {
		return await super.read(id, query);
	}

	async update(id, data, query) {
		return await super.update(id, data, query);
	}

	async query(query) {
		query.sort = "title ASC";
		return await super.query(query);
	}

	async destroy(id) {
		return await super.destroy(id);
	}

	getSelect(tableName, fieldSet) {
		let rawfields = global.fieldCache[tableName][fieldSet];

		let select = [];

		rawfields.forEach(
			function(item) {
				if (item.property && item.visible) {
					select.push(item.property);
				}
			}
		);

		return select;
	}

	async loadFields(connectionStrings) {

		global.fieldCache = global.fieldCache || {};

		if (!_.isArray(connectionStrings)) {
			connectionStrings = [connectionStrings];
		}

		let dataSources = [];
		let count = 0;

		connectionStrings.forEach(
			function (item) {
				if (item.indexOf("://") === -1) {
					dataSources.push(item);
				} else {
					let cs = connectionStringParser(item);
					dataSources.push(cs.database);
				}
			}
		);

		let hasTable = await this.hasTable();

		if (hasTable) {
			let results = await this.find({where: {dataSource: {"in": dataSources}}});

			results.forEach(
				function (item) {
					global.fieldCache[item.tableName] = item;

				}
			);
		} else {
			let files = fs.readdirSync(global.appRoot + '/src/schema/fields');
			files.forEach(
				function(file) {
					if (file.indexOf(".js") === -1) {
						return;
					}
					let tableName = inflector.underscore(file.split("-fields.js").join(""));

					global.fieldCache[tableName] = require("../../schema/fields/" + file);
					count++;
				}
			);
		}
		console.log("Loaded " + Object.keys(global.fieldCache).length + " fields");
		return true;

	}

	async hasTable() {
		//TODO can this be done with knex.
		if (this.tableExists === null) {
			let builder = this.queryBuilder;
			let query = knex(
				{
					client: this.queryBuilder.client,
				}
			);
			let exists = await this.execute(query.schema.hasTable("_fields"));
			//console.log("Fields has table");
			//console.log(exists);
			this.tableExists = exists.length > 0;
		}
		return this.tableExists;
	}

	async get(tableName, fromCache) {

		global.fieldCache = global.fieldCache || {};
		if (fromCache !== false) {
			if (global.fieldCache[tableName]) {
				return global.fieldCache[tableName];
			}
		}

		//TODO need to support various tableName styles
		//1. table_name  - snakecase
		//2. Table_Name - capital snake case
		//3. tableName - camel case
		//4. TableName - capital camel case

		let hasTable = await this.hasTable();

		if (hasTable) {
			let result = await this.find(
				{
					where: {
						tableName: tableName
					}
				}
			);

			if (result.length === 1) {
				global.fieldCache[tableName] = result[0];
				return global.fieldCache[tableName]
			}
			return null;
		} else {
			let path = global.appRoot + "/src/schemas/fields/" + inflector.dasherize(tableName);
			if (fs.existsSync(path + ".js")) {
				global.fieldCache[tableName] = require(path);
			}
			//if (fs.existsSync(global.appRoot + "/src/schemas/fields/" ))
		}
	}

	async set(tableName, data) {
		let table = await this.get(tableName, false);
		if (table) {
			let result = await this.update(table.id, data, true);
			if (!result.error) {
				global.fieldCache = global.fieldCache || {};
				global.fieldCache[tableName] = result;
			}
		} else {
			let hasTable = await this.hasTable();
			if (hasTable) {
				table = this.create(data);
				if (table.error) {
					console.log("fields set error " + table.error);
				} else {
					await cache.set("fields_" + tableName, table);
				}
				return table;
			}
		}
	}

	async createTable() {

		//TODO mysql and mssql will need to use text for storage, which means, we'll also have to JSON.parse

		await this.execute(
			"-- auto-generated definition\n" +
			"create table \"_fields\"\n" +
			"(\n" +
			"  id           uuid        not null\n" +
			"    constraint fields_pkey\n" +
			"    primary key,\n" +
			"  data_source  varchar(64),\n" +
			"  title        varchar(255),\n" +
			"  table_name   varchar(64) not null,\n" +
			"  admin_index  jsonb,\n" +
			"  admin_form   jsonb,\n" +
			"  admin_read   jsonb,\n" +
			"  public_index jsonb,\n" +
			"  public_form  jsonb,\n" +
			"  public_read  jsonb,\n" +
			"  status       varchar(32),\n" +
			"  created_at   timestamp with time zone default now(),\n" +
			"  updated_at   timestamp with time zone default now()\n" +
			");\n" +
			"\n" +
			"create unique index fields_id_uindex\n" +
			"  on \"_fields\" (id);\n" +
			"\n" +
			"create unique index fields_table_name_uindex\n" +
			"  on \"_fields\" (table_name);\n" +
			"\n"
		)
	}

}