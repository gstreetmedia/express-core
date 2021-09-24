const ModelBase = require('./ModelBase');
const _ = require('lodash');
const inflector = require("../helper/inflector");
const connectionStringParser = require("../helper/connection-string-parser");
const fs = require("fs");
const path = require("path");
const exists = require("util").promisify(fs.exists);
const readFile = require("util").promisify(fs.readFile);
global.fieldCache = global.fieldCache || {};
let hasFieldTable = false;

class FieldModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() {
		return "_fields";
	}

	get dataSource() {
		return "DEFAULT_DB";
	}

	async update(id, data) {
		let result = await super.update(id, data, true);
		if (!result.error) {
			global.fieldCache[result.tableName] = result;
			await this.saveFile(result.tableName, result);
		}
		return result;
	}

	async create(data) {
		let result = await super.create(data, true);
		if (!result.error) {
			global.fieldCache[result.tableName] = result;
			await this.saveFile(result.tableName, result);
		}
		return result;
	}

	async getFields() {
		await this.getSchema();
		if (this.fields) {
			return this.fields;
		}
		if (global.fieldCache[this.tableName]) {
			return global.fieldCache[this.tableName];
		}
		this._fields = await this.get(this.tableName); //Need a primer
		let results = await this.findOne({
			where : {
				tableName : this.tableName
			}
		});
		if (results && results.id) {
			hasFieldTable = true;
			this._fields = global.fieldCache[this.tableName] = results;
		} else {
			hasFieldTable = false;
		}

		return this.fields;
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

	async get(tableName, fromCache) {

		if (fromCache !== false && global.fieldCache[tableName]) {
			return global.fieldCache[tableName];
		}

		//TODO need to support various tableName styles
		//1. table_name  - snakecase
		//2. Table_Name - capital snake case
		//3. tableName - camel case
		//4. TableName - capital camel case

		if (hasFieldTable && process.env.CORE_FIELDS_SOURCE !== "local") {
			let result = await this.findOne(
				{
					where: {
						tableName: tableName
					}
				}
			);
			if (result && !result.error) {
				global.fieldCache[tableName] = result;
				return global.fieldCache[tableName]
			}
		}
		return this.loadFile(tableName);
	}

	async loadFile(tableName) {
		this.log("loadFile", tableName);
		let schema;
		let p = path.resolve(__dirname + "/../../schema/fields/" + this.getLocalFileName(tableName));
		if (await exists(p)) {
			this.log("loadFile", p);
			schema = require(p.split(".js").join(""));
			global.fieldCache[schema.tableName] = schema;
		}
		if (!schema) {
			p = path.resolve(__dirname + "/../schema/fields/" + this.getLocalFileName(tableName));
			if (await exists(p)) {
				this.log("loadFile", p);
				schema = require(p.split(".js").join(""));
				global.fieldCache[schema.tableName] = schema;
				return schema;
			}
			if (!schema) {
				this.log("loadFile", "No fields @ " + p);
			}
		}
		if (!schema) {
			console.error("Could Not Load fields for " + tableName);
		}
		return schema;
	}

	saveFile(tableName, data) {
		let p = path.resolve(__dirname + "/../../schema/fields/" + this.getLocalFileName(tableName));
		let template = require("../task/templates/fields");
		fs.writeFileSync(p, template(data));
	}

	async set(tableName, data) {
		await this.getSchema();
		await this.getFields();

		if (hasFieldTable) {
			let result;
			let table = await this.get(tableName, false);
			if (table && table.id) {
				result = await this.update(table.id, data, true);
			} else {
				result = await this.create(data, true);
			}
		} else {
			this.saveFile(tableName, data);
		}
	}

	getLocalFileName(tableName) {
		let file = inflector.dasherize(tableName.toLowerCase()) + "-fields.js";
		if (file.indexOf("-") === 0) {
			file = "_" + file.substring(1, file.length)
		}
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

	get relations() {
		return {
			schema : {
				relation : "HasOne",
				modelClass : "SchemaModel",
				join : {
					from : "tableName",
					to : "tableName"
				}
			}
		}
	}

}

module.exports = FieldModel;
