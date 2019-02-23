const ModelBase = require('./ModelBase');
const _ = require('lodash');
const schema = require('../schema/fields-schema');
const validation = require('../schema/validation/fields-validation');
const fields = require('../schema/fields/fields-fields');
const cache = require("../helper/cache-manager");
const md5 = require("md5");
const connectionStringParser = require("connection-string");

module.exports = class FieldModel extends ModelBase {

	constructor(req) {
		super(schema, validation, fields, req);
		this.tableExists = null;
	}

	get connectionString() {
		return process.env.DEFAULT_DB;
	}

	static get schema() {
		return schema;
	}

	static get validation() {
		return validation;
	}

	static get fields() {
		return fields;
	}

	async index(key, value) {
		return await super.index(key, value);
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
		return await super.query(query);
	}

	async destroy(id) {
		return await super.destroy(id);
	}

	async loadFields(connectionStrings) {
		if (!_.isArray(connectionStrings)) {
			connectionStrings = [connectionStrings];
		}

		let strings = [];

		connectionStrings.forEach(
			function (item) {
				let cs = connectionStringParser(item);
				cs.connectionString = item;
				strings.push(cs);
				//console.log();
			}
		);

		let results = await this.find({where: {dataSource: {"!=": null}}});
		//console.log(results);

		let count = 0;
		results.forEach(
			function (item) {
				strings.forEach(
					function (cs) {

						if (cs.path[0] === item.dataSource) {
							global.fieldCache = global.fieldCache || {};
							global.fieldCache[item.tableName] = item;
							count++;
						}
					}
				)
			}
		);
		console.log("Loaded " + count + " fields");
	}

	async hasTable() {
		if (this.tableExists === null) {
			let result = await this.execute(
				'SELECT EXISTS (\n' +
				'    SELECT 1\n' +
				'    FROM   information_schema.tables\n' +
				'    WHERE  table_schema = \'public\'\n' +
				'           AND    table_name = \'_fields\'\n' +
				');'
			)

			this.tableExists = result[0].exists;

			//console.log("this.tableExists => " + this.tableExists);
		}
		return this.tableExists;
	}

	async get(tableName, fromCache) {

		if (fromCache !== false) {
			let result = await cache.get("fields_" + tableName);
			if (result) {
				return result;
			}
		}

		//TODO need to support various tableName styles
		//1. table_name  - snakecase
		//2. Table_Name - capital snake case
		//3. tableName - camel case
		//4. TableName - capital camel case

		let result = await this.find(
			{
				where: {
					tableName: tableName
				}
			}
		);

		if (result.length === 1) {
			await cache.get("fields_" + tableName, result[0]);
			return result[0];
		}
		return null;

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
			table = this.create(data);
			if (table.error) {
				console.log("fields set error " + table.error);
			} else {
				await cache.set("fields_" + tableName, table);
			}
			return table;
		}
	}

	async createTable() {
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