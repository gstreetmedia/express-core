const _ = require( 'lodash' );

const fs = require("fs");
const promisify = (fn) => new Promise((resolve, reject) => fn(resolve));
const inflectFromTable = require("../helper/inflect-from-table");
const poolMySql = require("../model/model-base/pool-mysql");
const SchemaBase = require("./SchemaBase");
const cs = require("../helper/connection-string-parser");
const inflector = require("../helper/inflector")

class MySqlSchema extends SchemaBase{

	constructor(options) {
		super(options);
		this.map = {
			columnName : "columnName",
			type : "dataType",
			autoIncrement : "autoIncrement"
		}
	}

	/**
	 * Returns a list of tables in a DB
	 * @returns {Promise<null|[]>}
	 */
	async getTables() {

		if (this._tables) {
			return this._tables;
		}
		let pool = await poolMySql(this.options.connectionString);

		let q = `SELECT DISTINCT(TABLE_NAME) as \`tableName\` FROM information_schema.columns WHERE TABLE_SCHEMA = '${this.cs.database}'`;
		let data =  await pool.query(q);
		let tables = [];
		data.forEach(
			function(row) {
				tables.push(row.tableName);
			}
		)
		this._tables = _.uniq(tables);
		return _.clone(this._tables);
	}

	/**
	 * Returns an object of columns for a table
	 * @param tableName
	 * @returns {Promise<{}>}
	 */
	async getColumns(tableName) {
		if (this._columns[tableName]) {
			return this._columns[tableName];
		}
		let pool = await poolMySql(this.options.connectionString);
		let data =  await pool.query(`SELECT * FROM information_schema.columns WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = '${this.cs.database}'`);
		let columns = [];

		data.forEach(
			function(row) {
				let obj = {};
				Object.keys(row).forEach(
					function(key) {
						obj[inflector.camelize(key.toLowerCase(), false)] = row[key];
					}
				)
				columns.push(obj);
			}
		)
		this._columns[tableName] = columns;
		return this._columns[tableName];
	}



	/**
	 * Get the primary key for a table, if one exists
	 * @param tableName
	 * @returns {Promise<string>}
	 */
	async getPrimaryKey(tableName) {
		let columns = await this.getColumns(tableName);
		let primaryKey;
		columns.forEach(
			(column) => {
				if (column.columnKey === "PRI" || column.extra === "auto_increment") {
					primaryKey = inflectFromTable.propertyName(column.columnName);
				}
			}
		)
		if (!primaryKey) {
			console.error("Could not determine primary key for table -> " + tableName + ". Maybe a composite key?")
		}
		return primaryKey;
	}

	columnToObject(column) {
		var schemaProperty = {
			type: 'null',
			description : column.columnComment || '',
			columnName : column.columnName
		};

		if (!isNaN(column.characterMaximumLength) && column.characterMaximumLength !== null) {
			schemaProperty.maxLength = column.characterMaximumLength;
		}

		switch(column.dataType)
		{
			case 'text':
			case "character varying":
			case "varchar" :
			case "longtext" :
			case "tinytext" :
			case "mediumtext" :
			{
				schemaProperty.type   = 'string';
				switch (column.columnComment) {
					case "object" :
					case "json" :
						schemaProperty.type = "object";
						break;
					case "array" :
						schemaProperty.type = "array";
						break;
					case "int[]" :
						schemaProperty.type = "array";
						schemaProperty.format = "int"
						break;
					case "char[]" :
						schemaProperty.type = "array";
						schemaProperty.format = "string"
						break;
					case "varchar[]" :
						schemaProperty.type = "array";
						schemaProperty.format = "string"
						break;
					case "uuid" :
						schemaProperty.format = 'uuid';
						break;
					case "uuid[]" :
						schemaProperty.type = 'array';
						schemaProperty.format = 'uuid';
						break;
				}
			} break;

			case 'char':
				schemaProperty.type   = 'string';
				schemaProperty.length = column.characterMaximumLength;

				if (column.characterMaximumLength === 36) {
					schemaProperty.format = "uuid";
				}
				break;
			case 'uuid': {
				schemaProperty.type = 'string';
				schemaProperty.format = 'uuid';
				schemaProperty.length = column.characterMaximumLength;
				break;
			}

			case 'date':
			{
				schemaProperty.type   = 'string';
				schemaProperty.format = 'date';
			} break;

			case 'timestamp with time zone':
			case 'timestamp without time zone':
			case 'timestamp':
			case 'time':
			case 'datetime':
			{
				schemaProperty.type   = 'string';
				schemaProperty.format = 'date-time';
			} break;

			case 'boolean':
			{
				schemaProperty.type = 'boolean';
			} break;

			case 'real':
			case 'float8':
			case 'int':
			case 'smallint':
			case 'decimal':
			case 'bigint':
			case 'integer':
			case 'double precision':
			case 'numeric':
			case 'tinyint' :
			case 'double' :
			{
				schemaProperty.type = 'number';
				switch (column.dataType) {
					case 'int':
					case 'smallint':
					case 'bigint':
					case 'integer':
						schemaProperty.format = 'integer';
						break;
					case 'tinyint':
						schemaProperty.type = 'boolean';
						break;
					case 'decimal':
					case 'double' :
					case 'double precision':
						schemaProperty.format = 'decimal';
						break;
				}
			} break;

			case 'json':
			case 'jsonb':
			{
				schemaProperty.type       = 'object';
				schemaProperty.properties = {};
			} break;

			case 'interval':
			{
				schemaProperty = {
					oneOf: [
						{
							type:         'number',
							description:  'Duration in seconds'
						},
						{
							type:         'string',
							description:  'Descriptive duration i.e. 8 hours'
						},
						{
							type:         'object',
							description:  'Duration object',
							properties: {
								years:        { type: 'number' },
								months:       { type: 'number' },
								days:         { type: 'number' },
								hours:        { type: 'number' },
								minutes:      { type: 'number' },
								seconds:      { type: 'number' },
								milliseconds: { type: 'number' }
							}
						},
					]
				}
				break;
			}

			default:
			{
				//console.warn( 'UNKNOWN TYPE: ' + column.data_type );
				//console.log(column);
			} break;
		}

		if (column.extra === "auto_increment") {
			schemaProperty.autoIncrement = true;
			schemaProperty.readOnly = true
		}

		if (column.isNullable === "YES") {
			schemaProperty.allowNull = true;
		} else {
			schemaProperty.allowNull = false;
			if (schemaProperty.default === null) {
				delete schemaProperty.default;
			}
		}

		if ( column.privileges.indexOf("update") === -1) {
			schemaProperty.readOnly = true
		}

		if (column.columnKey === "UNI") {
			schemaProperty.unique = true;
		}

		if (_.isString(column.columnDefault)) {
			switch (column.columnDefault) {
				case "CURRENT_TIMESTAMP" :
				case "current_timestamp()" :
					schemaProperty.default = "now";
					break;
				default :
					if (column.columnDefault === "''") {
						schemaProperty.default = "";
					} else {
						column.columnDefault = column.columnDefault.split("'").join("");
						schemaProperty.default = column.columnDefault === "NULL" ? null : column.columnDefault;
					}
					if (schemaProperty.allowNull && schemaProperty.default === "") {
						schemaProperty.default = null;
					}
			}
		}

		return schemaProperty;
	}
}

module.exports = MySqlSchema;
