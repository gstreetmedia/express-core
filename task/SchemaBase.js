const ModelBase = require("../model/ModelBase");
const SchemaModel = require("../model/SchemaModel");
const _ = require("lodash");
const cs = require("../helper/connection-string-parser");
const inflector = require("../helper/inflector")
const inflectFromTable = require("../helper/inflect-from-table")

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
			columnName : "columnName",
			type : "dataType",
			autoIncrement : "autoIncrement"
		}
	}

	async getTables() {
		//Override in Sub Class
	}

	async hasTable(tableName) {
		return await this.builder.schema.hasTable(tableName);
	}

	async getNewProperties(tableName) {
		let properties = await this.getSchema(tableName).properties;
		let sm = new SchemaModel();
		let schema = await sm.get(tableName, false);
		let dbKeys = Object.keys(schema.properties);
		let difference = {};
		Object.keys(properties).forEach(
			(key) => {
				if (!dbKeys.includes(key)) {
					difference[key] = properties[key];
				}
			}
		)
		return difference;
	}

	async getRemovedProperties(tableName) {
		let properties = await this.getSchema(tableName).properties;
		let sm = new SchemaModel();
		let schema = await sm.get(tableName, false);
		let schemaKeys = Object.keys(properties);
		let dbKeys = Object.keys(schema.properties);
		let difference = {};
		Object.keys(properties).forEach(
			(key) => {
				if (dbKeys.includes(key)) {
					difference[key] = properties[key];
				}
			}
		)
		return difference;
	}

	async updateTable(tableName) {
		let removeList = await this.getRemovedProperties(tableName);
		let addList = await this.getNewProperties(tableName);
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
			return this._columns.tableName;
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
		let properties = {};
		let context = this;
		columns.forEach(
			(column) => {
				properties[inflectFromTable.propertyName(column[context.map.columnName])] = this.columnToObject(column);
			}
		)
		this._properties[tableName] = properties;
		return properties;
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
		if (primaryKey && !properties[primaryKey].autoIncrement) {
			required.push(primaryKey);
		}

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
		let readOnly = [];
		Object.keys(properties).forEach(
			(item) => {
				if (properties[item].readOnly) {
					readOnly.push(item);
				}
			}
		)
		return _.uniq(readOnly);
	}

	async getSchema(tableName) {
		if (this._schemas[tableName]) {
			return this._schemas[tableName];
		}
		let o = await this.getRelationsAndForeignKeys(tableName);

		let schema = {
			$schema: 'http://json-schema.org/draft-06/schema#',
			$id: (this.options.baseUrl || "") + tableName + '.json',
			description: 'Generated: ' + new Date(),
			title: inflector.classify(this.sanitizeTableName(tableName)),
			dataSource: this.cs.database,
			tableName: tableName,
			route: inflectFromTable.route(this.sanitizeTableName(tableName)),
			primaryKey: await this.getPrimaryKey(tableName),
			properties: await this.getProperties(tableName),
			relations: o.relations,
			foreignKeys: o.foreignKeys,
			required: await this.getRequired(tableName),
			readOnly: await this.getReadOnly(tableName),
			type: 'object',
			additionalProperties: this.options.additionalProperties === undefined ? false : !!this.options.additionalProperties,
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

	sanitizeTableName(tableName, sigularize) {
		this.tablePrefix.forEach(
			(prefix) => {
				tableName = tableName.indexOf(prefix) === 0 ? tableName.substring(prefix.length, tableName.length) : tableName;
			}
		)
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
				length : 36
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
		console.log("sourceTableName -> " + sourceTableName);
		console.log("normalizedSourceTable -> " + normalizedSourceTable);
		while (sourceKeys.length > 0) {
			let sourceKey = sourceKeys[0];
			let sourceColumnName = sourceProperties[sourceKey].columnName;
			let sourceProperty = sourceProperties[sourceKey];
			let tables = _.clone(allTables);

			if (!this.validRelationProperty(sourceProperty, sourceKey, sourceTableName)) {
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

				while (targetKeys.length > 0) {
					let targetKey = targetKeys[0];
					let targetProperty = targetProperties[targetKey];
					let targetColumnName = targetProperties[targetKey].columnName;

					if (!this.validRelationProperty(targetProperty, targetKey, table)) {
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
									relations[relationKey] = {
										type: "HasOne",
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
			function(row) {
				let obj = {};
				Object.keys(row).forEach(
					function(key) {
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
