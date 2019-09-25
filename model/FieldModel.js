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
const path = require("path");


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
		connectionStrings = connectionStrings || [];
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
			console.log("Loading Local Fields");
			let keys = Object.keys(global.schemaCache).forEach(
				(schemaKey) => {
					let schema = global.schemaCache[schemaKey];
					let p = path.resolve(global.appRoot + "/src/schema/fields/" + this.getLocalFileName(schema.tableName));
					if (fs.existsSync(p)) {
						let fields = require(p.split(".js").join(""));
						global.fieldCache[schema.tableName] = fields;
					}


				}
			)
			/*
			let files = fs.readdirSync(global.appRoot + '/src/schema/fields');
			files.forEach(
				function(file) {
					if (file.indexOf(".js") === -1) {
						return;
					}
					let tableName = inflector.underscore(file.split("-fields.js").join(""));
					let field = require("../../schema/fields/" + file);

					global.fieldCache[tableName] = ;
					count++;
				}
			);
			 */
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
			let p = path.resolve(global.appRoot + "/src/schema/fields/" + this.getLocalFileName(tableName));
			if (fs.existsSync(p)) {
				global.fieldCache[tableName] = require(p.split(".js").join(""));
				return global.fieldCache[tableName];
			} else {
				console.log("missing table " + p);
			}
			//if (fs.existsSync(global.appRoot + "/src/schema/fields/" ))
		}
	}

	async set(tableName, data) {
		let table = await this.get(tableName, false);
		let hasTable = await this.hasTable();

		console.log(tableName + " => " + hasTable);

		if (table && hasTable) {
			console.log("save db");
			let result = await this.update(table.id, data, true);
			if (!result.error) {
				global.fieldCache = global.fieldCache || {};
				global.fieldCache[tableName] = result;
			}
		} else if (table) {
			console.log("save local");
			let p = path.resolve(global.appRoot + "/src/schema/fields/" + this.getLocalFileName(tableName));

			if (fs.existsSync(p)) {
				fs.writeFileSync(p, "module.exports = " + JSON.stringify(data));
				global.fieldCache[tableName] = data;
			}
		}
	}

	getLocalFileName(tableName) {
		let file = inflector.dasherize(tableName.toLowerCase()) + "-fields.js";
		return file;
	}

	async createTable() {

		//TODO mysql and mssql will need to use text for storage, which means, we'll also have to JSON.parse

		await this.execute(
			`
			create table if not exists _schemas
			(
				id uuid not null
					constraint schemas_pkey
						primary key,
				data_source varchar(64),
				title varchar(255),
				table_name varchar(64) not null,
				primary_key varchar(64) default 'id'::character varying,
				properties jsonb not null,
				required varchar(64) [],
				read_only varchar(64) [],
				created_at timestamp with time zone default now(),
				updated_at timestamp with time zone default now()
			);
				
			create unique index if not exists schemas_id_uindex
				on _schemas (id);
			
			create unique index if not exists schemas_table_name_uindex
				on _schemas (table_name);
			`
		)
	}

}