const ModelBase = require("../model/ModelBase");
const SchemaModel = require("../model/SchemaModel");
const _ = require("lodash");
const cs = require("../helper/connection-string-parser");
const inflector = require("../helper/inflector")
const inflectFromTable = require("../helper/inflect-from-table")
const fs = require("fs");
const path = require("path");
const beautify = require("json-beautify");

class SchemaBase extends ModelBase {

	constructor(options) {
		super(null);
		this.options = options;
		this.tablePrefix = "";
		this._tables = null;
		this._columns = {};
		this._relations = {};
		this._properties = {};
		this._schemas = {};
		console.log(options);
		if (options.pool) {
			this.pool = options.pool;
		}
		if (options.tablePrefix) {
			this.tablePrefix = options.tablePrefix;
		}
		if (options.connectionString) {
			this.connectionString = options.connectionString;
			this.cs = cs(this.connectionString);
		} else {
			throw new Error("Options must contain a connectionString")
		}
		this.map = {
			columnName: "columnName",
			type: "dataType",
			autoIncrement: "autoIncrement"
		}
	}

	/**
	 * Get an array of the tables in this db
	 * @returns {Promise<void>}
	 */
	async getTables() {
		//Override in Sub Class
	}

	/**
	 * Does the db have this table
	 * @param tableName
	 * @returns {Promise<*>}
	 */
	async hasTable(tableName) {
		return await this.builder.schema.hasTable(tableName);
	}

	/**
	 * Does the table have this column
	 * @param tableName
	 * @param columnName
	 * @returns {Promise<*>}
	 */
	async hasColumn(tableName, columnName) {
		return await this.builder.hasColumn(tableName, columnName);
	}

	/**
	 * Returns the new columns in a table
	 * @param tableName
	 * @returns {Promise<unknown[]>}
	 */
	async getNewColumns(tableName) {
		let properties = await this.getSchema(tableName).properties;
		let tableColumns = [];
		Object.keys(properties).forEach(
			(key) => {
				tableColumns.push(properties[key].colummName);
			}
		)
		let sm = new SchemaModel();
		let schema = await sm.get(tableName, this.cs.db);
		let schemaColumns = [];
		Object.keys(schema.properties).forEach(
			(key) => {
				schemaColumns.push(schema.properties[key].columnName);
			}
		)
		return _.difference(tableColumns, schemaColumns);
	}

	/**
	 * Gets the removed columns in a table
	 * @param tableName
	 * @returns {Promise<unknown[]>}
	 */
	async getRemovedColumns(tableName) {
		let properties = await this.getSchema(tableName).properties;
		let tableColumns = [];
		Object.keys(properties).forEach(
			(key) => {
				tableColumns.push(properties[key].colummName);
			}
		)
		let sm = new SchemaModel();
		let schema = await sm.get(tableName, this.cs.db);
		let schemaColumns = [];
		Object.keys(schema.properties).forEach(
			(key) => {
				schemaColumns.push(schema.properties[key].columnName);
			}
		)
		return _.difference(schemaColumns, tableColumns);
	}

	/**
	 * Add / Remove / Alter columns in a table
	 * @param tableName
	 * @returns {Promise<{success: boolean}|{error: boolean, statusCode: number}|undefined>}
	 */
	async updateTable(tableName) {
		let removeList = await this.getRemovedColumns(tableName);
		let addList = await this.getNewColumns(tableName);
		let hasTable = await this.hasTable(tableName);
		if (!hasTable) {
			return await this.createTable(tableName);
		}
		this.builder.schema(tableName,
			(table) => {
				removeList.forEach(
					(key) => {
						table.dropColumn(key);
					}
				)
				addList.forEach(
					(key) => {
						this.createColumn(table, tableName, key).then((result) => {
						});
					}
				)
			}
		)
		//alter table _config modify settings varchar(32) null comment 'json';
	}

	async createTable(tableName) {
		let schema = this.getSchema(tableName);
		try {
			await builder.schema.createTable(
				schema.tableName,
				(table) => {
					Object.keys(schema.properties).forEach(
						(key) => {
							this.createColumn(table, tableName, key, schema).then((result) => {
							});
						}
					)
				}
			);
			return {
				success: true
			}
		} catch (e) {
			console.log(e);
			return {
				error: true,
				statusCode: 500
			}
		}
	}

	async createColumn(table, tableName, key) {
		let schema = this.getSchema(tableName);
		let columnBuilder;
		let length = schema.properties[key].length ? schema.properties[key].length : schema.properties[key].maxLength;
		let type = schema.properties[key].type;
		let format = schema.properties[key].format;

		switch (type) {
			case "string" :
				//format
				switch (format) {
					case "date-time" :
						columnBuilder = table.datetime(schema.properties[key].columnName);
						break;
					case "date" :
						columnBuilder = table.date(schema.properties[key].columnName);
						break;
					case "uuid" :
						columnBuilder = table.uuid(schema.properties[key].columnName);
						if (c.client !== "mysql") {
							columnBuilder.comment("uuid");
						}
						break;
					default :
						if (length > 255) {
							columnBuilder = table.text(schema.properties[key].columnName);
						} else {
							columnBuilder = table.string(schema.properties[key].columnName, length);
						}
				}
				break;
			case "integer" :
				columnBuilder = table.integer(schema.properties[key].columnName, length);
				//length
				break;
			case "boolean" :
				columnBuilder = table.boolean(schema.properties[key].columnName);
				break;
			case "array" :
				switch (format) {
					case "integer" :
						if (c.client !== "mysql") {
							columnBuilder = table.specificType(schema.properties[key].columnName, 'int[]');
						} else {
							columnBuilder = table.jsonb(schema.properties[key].columnName);
							columnBuilder.comment("int[]");
						}
						break;
					case "uuid" :
						if (c.client !== "mysql") {
							columnBuilder = table.specificType(schema.properties[key].columnName, 'uuid[]');
						} else {
							columnBuilder = table.jsonb(schema.properties[key].columnName);
							columnBuilder.comment("uuid[]");
						}
						break;
					default :
						if (c.client !== "mysql") {
							columnBuilder = table.specificType(schema.properties[key].columnName, 'char[]');
						} else {
							columnBuilder = table.jsonb(schema.properties[key].columnName);
							columnBuilder.comment("char[]");
						}
				}
				break;
			case "object" :
				columnBuilder = table.jsonb(schema.properties[key].columnName);
				if (c.client === "mysql") {
					columnBuilder.comment("object");
				}
				break;
		}

		if (!columnBuilder) {
			console.log("Error getting column for " + key);
			console.log(schema.properties[key]);
			return;
		}

		if (schema.primaryKey === key) {
			columnBuilder.primary();
		}
		if (schema.properties[key].unique) {
			columnBuilder.unique();
		}
		if (schema.properties[key].default === "now") {
			columnBuilder.defaultTo(builder.fn.now());
		}
		if (schema.properties[key].description && schema.properties[key].description !== "") {
			columnBuilder.comment(schema.properties[key].description);
		}
		if (schema.properties[key].allowNull === false) {
			columnBuilder.notNullable();
		} else if (schema.properties[key].type !== "boolean") {
			columnBuilder.nullable();
		}
	}

	get builder() {
		if (!this._builder) {
			let c = cs(this.options.connectionString);

			this._builder = knex(
				{
					client: c.client,
					debug: true,
					connection: {
						host: c.host,
						user: c.username,
						password: c.password,
						database: c.database,
						port: c.port
					}
				},
			)
		}

		return this._builder;

	}

	/**
	 * Returns an object with all columns
	 * @param tableName
	 * @returns {Promise<{}>}
	 */
	async getColumns(tableName) {
		if (this._columns[tableName]) {
			return this._columns[tableName];
		}
		return null;
	}

	/**
	 * Returns a single column from a table
	 * @param tableName
	 * @param columnName
	 * @returns {Promise<*>}
	 */
	async getColumn(tableName, columnName) {
		let columns = await this.getColumns(tableName);
		let targetColumn = null;
		columns.forEach(
			(column) => {
				if (column.columnName === columnName) {
					targetColumn = column;
				}
			}
		)
		return targetColumn;
	}


	/**
	 * @param tableName
	 * @returns {Promise<{}>}
	 */
	async getProperties(tableName) {
		if (this._properties[tableName]) {
			return this._properties[tableName];
		}
		let columns = await this.getColumns(tableName);
		let primaryKey = await this.getPrimaryKey(tableName);
		let properties = {};
		let context = this;
		let index = 0;
		while (columns.length > 0) {

			let column = columns[0];
			let o = this.columnToObject(column);

			let show = context.isViewOrUpdate(tableName, o.columnName, primaryKey);
			if (o.readOnly === true) {
				show = false;
			}
			o.visibility = {
				admin: {index: true, create: show, read: true, update: show, order: index},
				public: {query: true, create: show, read: true, update: show, order: index},
			}
			properties[inflectFromTable.propertyName(column[context.map.columnName])] = o;
			index++;
			columns.shift();
		}

		this._properties[tableName] = properties;
		return properties;
	}

	isViewOrUpdate(tableName, columnName, primaryKey) {

		if (columnName === primaryKey) {
			return false;
		}
		if (columnName.indexOf("updated") === 0 || columnName.indexOf("created") === 0) {
			return false;
		}
		return true;
	}

	/**
	 * Get the primary key for a table, if one exists
	 * @param tableName
	 * @returns {Promise<string>}
	 */
	async getPrimaryKey(tableName) {
		return 'id';
	}

	async getRequired(tableName) {
		let required = [];
		let properties = await this.getProperties(tableName);
		let primaryKey = await this.getPrimaryKey(tableName);

		primaryKey = this.getPrimaryKeyPropertyName(properties, primaryKey);
		required.push(primaryKey);

		Object.keys(properties).forEach(
			(item) => {
				if (properties[item].allowNull === false && !properties[item].default) {
					required.push(item);
				}
			}
		)
		return _.uniq(required);
	}

	async getReadOnly(tableName) {
		let properties = await this.getProperties(tableName);
		let primaryKey = await this.getPrimaryKey(tableName);
		primaryKey = this.getPrimaryKeyPropertyName(properties, primaryKey);
		let readOnly = [primaryKey];
		let context = this;
		Object.keys(properties).forEach(
			(item) => {
				if (properties[item].readOnly) {
					if (!context.isViewOrUpdate(tableName, properties[item].columnName, primaryKey)) {
						readOnly.push(item);
					}
				}
			}
		)
		return _.uniq(readOnly);
	}

	getPrimaryKeyPropertyName(properties, primaryKey) {
		Object.keys(properties).forEach(
			(key) => {
				if (properties[key].columnName === primaryKey) {
					primaryKey = key;
				}
			}
		)
		return primaryKey;
	}

	/**
	 * @param tableName
	 * @returns {Promise<{foreignKeys: {}, $schema: string, methods: {post: [{"/": string}], get: [{"/": string},{"/:id": string}], delete: [{"/:id": string},{"/": string}], put: [{"/:id": string},{"/": string}]}, description: string, readOnly: unknown[], title, type: string, required: unknown[], tableName, route: string, additionalProperties: boolean, relations: {}, dataSource: string, properties: {}, $id: string, primaryKey: string}|*>}
	 */
	async getSchema(tableName) {
		if (this._schemas[tableName]) {
			return this._schemas[tableName];
		}
		let o = await this.getRelationsAndForeignKeys(tableName);
		let primaryKey = await this.getPrimaryKey(tableName);
		let properties = await this.getProperties(tableName);
		primaryKey = this.getPrimaryKeyPropertyName(properties, primaryKey);

		let schema = {
			$schema: 'http://json-schema.org/draft-06/schema#',
			$id: (this.options.baseUrl || "") + tableName + '.json',
			description: 'Generated: ' + new Date(),
			title: inflector.classify(this.sanitizeTableName(tableName)),
			dataSource: this.cs.database,
			tableName: tableName,
			route: inflectFromTable.route(this.sanitizeTableName(tableName)),
			methods:
				{
					get: [
						{"/": "find"},
						{'/:id': "read"}
					],
					post: [
						{"/": "create"}
					],
					put: [
						{'/:id': "read"},
						{'/': "updateWhere"}
					],
					delete: [
						{'/:id': "destroy"},
						{'/': "destroyWhere"}
					]
				},
			primaryKey: primaryKey,
			properties: await this.getProperties(tableName),
			relations: o.relations,
			foreignKeys: o.foreignKeys,
			required: await this.getRequired(tableName),
			readOnly: await this.getReadOnly(tableName),
			type: 'object',
			additionalProperties: false,
		};
		this._schemas[tableName] = schema;
		return schema;
	}

	async getSchemas() {
		let tables = await this.getTables();
		let schemas = {};
		while (tables.length > 0) {
			schemas[tables[0]] = await this.getSchema(tables[0]);
		}
		return schemas;
	}

	async saveSchema(schema) {
		let p = path.resolve(global.appRoot + '/src/schema/' + schema.dataSource);
		if (!fs.existsSync(p)) {
			fs.mkdirSync(p)
		}
		let file = path.resolve(p + "/" + schema.tableName + ".json");
		console.log(file)
		fs.writeFileSync(file, beautify(schema, null, 4, 100))
	}

	sanitizeTableName(tableName, sigularize) {
		if (Array.isArray(this.tablePrefix)) {
			this.tablePrefix.forEach(
				(prefix) => {
					tableName = tableName.indexOf(prefix) === 0 ? tableName.substring(prefix.length, tableName.length) : tableName;
				}
			)
		}
		if (tableName.indexOf("_") === 0) {
			tableName = tableName.substring(1, tableName.length);
		}
		if (sigularize !== false) {
			return inflector.singularize(tableName);
		}
		return tableName;
	}

	validRelationProperty(property, name, table) {

		let validTypes = {
			string: {
				format: ["uuid"],
				length: 36
			},
			number: {
				format: ["integer"]
			},
			array: {
				format: ["uuid", "integer"]
			}
		};

		let process = true;

		if (Object.keys(validTypes).includes(property.type)) {
			if (validTypes[property.type].format.includes(property.format)) {
				process = true;
				//console.log(`1 ${table}.${name} valid ${property.columnName} -> ${property.type} ${property.format}`);
			} else {
				process = false;
				//console.log(`2 ${table}.${name} not valid ${property.columnName} -> ${property.type} ${property.format}`);
				//console.log(property);
			}
		} else {
			process = false;
			//console.log(`3 ${table}.${name} not valid ${property.columnName} -> ${property.type} ${property.format}`);
		}
		return process;
	}

	/**
	 * @param sourceTableName
	 * @returns {Promise<{foreignKeys: {}, relations: {}}>}
	 */
	async getRelationsAndForeignKeys(sourceTableName) {
		if (this._relations[sourceTableName]) {
			return this._relations[sourceTableName];
		}
		let sourceProperties = await this.getProperties(sourceTableName);
		let allTables = await this.getTables();
		//console.log(allTables);
		let context = this;
		let normalizedSourceTable = this.sanitizeTableName(sourceTableName);
		let relations = {};
		let foreignKeys = {};
		let sourceKeys = Object.keys(sourceProperties);
		let sourceColumns = _.map(sourceKeys, (key) => {
			return sourceProperties[key].columnName
		});

		//console.log("sourceTableName -> " + sourceTableName);
		//console.log("normalizedSourceTable -> " + normalizedSourceTable);
		//console.log("sourceColumns -> " + sourceColumns);

		let sourceMapRelations = [];

		if (this.options.relationMapping) {
			this.options.relationMapping.forEach(
				(row) => {
					if (_.intersection(row, sourceKeys).length === row.length) {
						sourceMapRelations.push(_.intersection(row, sourceKeys));
					}
				}
			)
		}

		while (sourceKeys.length > 0) {
			let sourceKey = sourceKeys[0];
			let sourceColumnName = sourceProperties[sourceKey].columnName;
			let sourceProperty = sourceProperties[sourceKey];
			let tables = _.clone(allTables);

			if (!this.validRelationProperty(sourceProperty, sourceKey, sourceTableName) && !sourceMapRelations) {
				sourceKeys.shift();
				continue;
			}

			while (tables.length > 0) {
				let table = tables[0];
				if (table === sourceTableName) { //this table, ignore
					tables.shift();
					continue;
				}

				let targetProperties = await context.getProperties(table);
				let normalizedTargetTable = this.sanitizeTableName(table);
				let relationKey = inflector.camelize(inflector.singularize(normalizedTargetTable), false);
				let targetKeys = Object.keys(targetProperties);
				let targetColumns = _.map(sourceKeys, (key) => {
					return sourceProperties[key].columnName
				});
				let targetMapRelations = [];

				if (this.options.relationMapping) {
					this.options.relationMapping.forEach(
						(row) => {
							if (_.intersection(row, targetKeys).length === row.length) {
								targetMapRelations.push(_.intersection(row, targetKeys));
							}
						}
					)
				}

				if (sourceMapRelations.length > 0 && targetMapRelations.length > 0) {
					let keys;
					sourceMapRelations.forEach(
						(row) => {
							targetMapRelations.forEach(
								(r) => {
									if (_.intersection(r, row).length === r.length) {
										keys = r;
									}
								}
							)
						}
					)
					relations[inflector.pluralize(relationKey)] = {
						type: "HasMany",
						model: inflectFromTable.modelName(this.sanitizeTableName(table, false)),
						join: {
							from: keys,
							to: keys
						}
					}
					tables.shift();
					continue;
				}

				while (targetKeys.length > 0) {
					let targetKey = targetKeys[0];
					let targetProperty = targetProperties[targetKey];
					let targetColumnName = targetProperties[targetKey].columnName;


					if (!this.validRelationProperty(targetProperty, targetKey, table) && !targetMapRelations) {
						targetKeys.shift();
						continue;
					}

					//console.log(targetColumnName + " vs " + normalizedSourceTable);


					//foo.id -> bar.foo_id
					if (targetColumnName.indexOf(normalizedSourceTable) === 0) {
						let targetMapKeys = [normalizedSourceTable + "_" + sourceColumnName, normalizedSourceTable + sourceColumnName];
						targetMapKeys.forEach(
							(targetMapKey) => {
								if (targetMapKey.toLowerCase() === targetColumnName.toLowerCase()) {
									relations[inflector.pluralize(relationKey)] = {
										type: "HasMany",
										model: inflectFromTable.modelName(this.sanitizeTableName(table, false)),
										join: {
											from: sourceKey,
											to: targetKey
										}
									}
								}
							}
						)
					}
					//foo.bar_id -> bar.id
					if (sourceColumnName.indexOf(normalizedTargetTable) === 0) {
						let sourceMapsKeys = [normalizedTargetTable + "_" + targetColumnName, normalizedTargetTable + targetColumnName];
						sourceMapsKeys.forEach(
							(sourceMapKey) => {
								if (sourceMapKey.toLowerCase() === sourceColumnName.toLowerCase()) {
									relations[targetProperty.type === "array" || sourceProperty.type === "array" ? inflector.pluralize(relationKey) : relationKey] = {
										type: targetProperty.type === "array" || sourceProperty.type === "array" ? "HasMany" : "HasOne",
										model: inflectFromTable.modelName(this.sanitizeTableName(table, false)),
										join: {
											from: sourceKey,
											to: targetKey
										}
									}
									foreignKeys[sourceKey] = {
										model: inflectFromTable.modelName(this.sanitizeTableName(table, false)),
										to: targetKey
									}
								}
							}
						)
					}

					targetKeys.shift();
				}
				tables.shift();
			}
			sourceKeys.shift();
		}
		this._relations[sourceTableName] = {relations: relations, foreignKeys: foreignKeys};
		return this._relations[sourceTableName];
	}

	columnToObject(column) {
		return {};
	}

	camelizeArray(array) {
		let rows = [];
		array.forEach(
			function (row) {
				let obj = {};
				Object.keys(row).forEach(
					function (key) {
						obj[inflector.camelize(key.toLowerCase(), false)] = row[key];
					}
				)
				rows.push(obj);
			}
		)
		return rows;
	}
}

module.exports = SchemaBase;

/*
{
				"title" : {
					"type" : "string"
				},
				"dataSource" : {
					"type" : "string"
				},
				"tableName" : {
					"type" : "string"
				},
				"route" : {
					"type" : "string"
				},
				"methods" : {
					"type" : "array",
					"format" : "object"
				},
				"primaryKey" : {
					"type" : "string"
				},
				"relations" : {
					"type" : "object"
				},
				"foreignKeys" : {
					"type" : "object"
				}
			}
 */
