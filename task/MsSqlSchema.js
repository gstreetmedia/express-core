const _ = require( 'lodash' );
const getPool = require("../model/model-base/pool-mssql");
const SchemaBase = require("./SchemaBase");

class MsSqlSchema extends SchemaBase{

	constructor(options) {
		super(options);
		this.map = {
			columnName : "columnName",
			type : "dataType",
			autoIncrement : "autoIncrement"
		}
		this._descriptions = {};
		this._enums = null;
	}

	async getPool() {
		if (!this.pool) {
			this.pool = await getPool(this.options.connectionString);
		}
		return this.pool;
	}

	/**
	 * Returns a list of tables in a DB
	 * @returns {Promise<null|[]>}
	 */
	async getTables() {

		if (this._tables) {
			return this._tables;
		}
		let pool = await this.getPool(this.options.connectionString);

		let q = `SELECT tables.TABLE_NAME as "tableName",
                        tables.TABLE_NAME as "tableType"
                 FROM information_schema.TABLES as tables
                 WHERE 	tables.table_schema = 'dbo'
                   AND 	tables.table_catalog = '${this.cs.database}'`;

		if (this.options.ignoreTables) {
			q += ` AND tables.table_name not in ('${this.options.ignoreTables.join("','")}')`
		}
		if (this.options.tables) {
			q += ` AND tables.table_name in ('${this.options.tables.join("','")}')`
		}
		let data;
		try {
			data = await pool.query(q);

			data = data.recordset;
			//let views = await this.getViews();
		} catch (e) {
			console.log(e);
			process.exit();
		}

		let tables = data.map((row)=>{return row.tableName});
		this._tables = _.uniq(tables);
		if (Array.isArray(this.options.ignoreTableWith)) {
			let temp = [];
			this._tables.forEach(
				(table) => {
					let add = true
					this.options.ignoreTableWith.forEach(
						(item) => {
							if (table.indexOf(item) !== -1) {
								add = false;
							}
						}
					)
					if (add) {
						temp.push(table);
					}
				}
			)
			this._tables = temp;
		}
		console.log(this._tables);
		return _.clone(this._tables);
	}

	/**
	 * Returns an object of columns for a table
	 * @param tableName
	 * @returns {Promise<{}>}
	 */
	async getColumns(tableName) {
		console.log(tableName);
		if (this._columns[tableName]) {
			return this._columns[tableName];
		}
		let pool = await this.getPool(this.options.connectionString);
		let q =`SELECT isc.*, istc.constraint_type
                     FROM information_schema.columns as isc
                              left join information_schema.constraint_column_usage as isccu
                                        on isccu.column_name = isc.column_name and
                                           isccu.table_name = isc.table_name
                              left join information_schema.table_constraints as istc
                                        on istc.constraint_name = isccu.constraint_name AND
                                           istc.table_name = isccu.table_name
                     WHERE 	isc.table_schema = 'dbo'
                     AND 	isc.table_catalog = '${this.cs.database}'
                     AND	isc.table_name = '${tableName}'`;

		let data;
		try {
			data = await pool.query(q);
			data = data.recordset;

		} catch (e) {
			console.log(e);
			console.log(q);
			process.exit();
		}

		let columns = this.camelizeArray(data);

		if (Array.isArray(this.options.ignoreColumnWith)) {
			let temp = [];
			columns.forEach(
				(column) => {
					let add = true
					this.options.ignoreColumnWith.forEach(
						(item) => {
							if (column.columnName.indexOf(item) !== -1) {
								add = false;
							}
						}
					)
					if (add) {
						temp.push(column);
					}
				}
			)
			columns = temp;
		}

		this._columns[tableName] = columns;
		return _.clone(this._columns[tableName]);
	}


	/**
	 * Get the primary key for a table, if one exists
	 * @param tableName
	 * @returns {Promise<string>}
	 */
	async getPrimaryKey(tableName) {
		if (this._primaryKey) {
			return  this._primaryKey;
		}
		let columns = await this.getColumns(tableName);
		let primaryKey = columns[0].columnName;
		columns.forEach(
			(column) => {
				if (column.constraintType === "PRIMARY KEY") {
					primaryKey = column.columnName;
				}
			}
		)
		this._primaryKey = primaryKey;
		return primaryKey;
	}

	columnToObject(column) {

		let schemaProperty = {
			type: 'null',
			columnName : column.columnName
		};

		if (column.characterMaximumLength) {
			schemaProperty.maxLength = column.characterMaximumLength;
		}

		let defaultValue;
		if ("columnDefault" in column) {
			defaultValue = column.columnDefault;
		}

		if (column.enum) {
			schemaProperty.enum = column.enum;
		}

		switch (column.dataType) {
			case 'text':
			case '"char"':
			case 'character varying':
			case 'varchar' :
				schemaProperty.type = 'string';

				if (column.dataType === "text") {
					schemaProperty.maxLength = column.characterMaximumLength = 1000000
				}
				break;

			case 'uuid': {
				schemaProperty.type = 'string';
				schemaProperty.format = 'uuid';
				break;
			}

			case 'ARRAY': {
				schemaProperty.type = 'array';

				switch (column.udtName) {

					case "_varchar" :
					case "varchar" :
					case 'character varying' :
					case '_character' :
					case '_bpchar' :

						schemaProperty.format = "string";
						schemaProperty.cast = "character";

					case "_text" :
						schemaProperty.format = "string";
						schemaProperty.cast = "text";
						break;
					case '_bigint':
					case '_integer':
					case "_int4" :
					case '_smallint':
						schemaProperty.format = "integer";
						schemaProperty.cast = "integer";
						break;
					case '_real':
					case '_float8':
					case 'double precision':
					case '_numeric':
						schemaProperty.format = "number";
						schemaProperty.cast = "numeric";
						break;
					case "_uuid" :
						schemaProperty.format = "uuid";
						schemaProperty.cast = "character";
						break;
					default :
						schemaProperty.format = column.udtName;
						schemaProperty.cast = "text";
				}

				if (defaultValue) {
					let prop = defaultValue.split("::")[0].split("'").join("");
					schemaProperty.default = prop.split("{").join("").split("}").join("").split(",");
				}

				break;
			}

			case 'date': {
				schemaProperty.type = 'string';
				schemaProperty.format = 'date';
				if (defaultValue === "CURRENT_TIMESTAMP") {
					schemaProperty.default = "now";
				}
			}
				break;

			case 'timestamp with time zone':
			case 'timestamp without time zone':
			case 'timestamp': {
				schemaProperty.type = 'string';
				schemaProperty.format = 'date-time';
				if (defaultValue === "CURRENT_TIMESTAMP") {
					schemaProperty.default = "now";
				}
			}
				break;

			case 'boolean': {
				schemaProperty.type = 'boolean';
				schemaProperty.default = defaultValue === "true" || defaultValue === true

			}
				break;

			case 'real':
			case 'float8':
			case 'int':
			case 'smallint':
			case 'bigint':
			case 'integer':
			case 'double precision':
			case 'numeric': {
				schemaProperty.type = 'number';
				switch (column.dataType) {
					case 'int':
					case 'smallint':
					case 'bigint':
					case 'integer':
						schemaProperty.format = 'integer';

				}
				if (column.numericPrecision) {
					schemaProperty.precision = column.numericPrecision;
				}

			}
				break;

			case 'json':
			case 'jsonb': {
				schemaProperty.type = 'object';
				schemaProperty.properties = {};
			}
				break;

			case 'interval': {
				schemaProperty = {
					oneOf: [
						{
							type: 'number',
							description: 'Duration in seconds'
						},
						{
							type: 'string',
							description: 'Descriptive duration i.e. 8 hours'
						},
						{
							type: 'object',
							description: 'Duration object',
							properties: {
								years: {type: 'number'},
								months: {type: 'number'},
								days: {type: 'number'},
								hours: {type: 'number'},
								minutes: {type: 'number'},
								seconds: {type: 'number'},
								milliseconds: {type: 'number'}
							}
						},
					]
				}
				break;
			}

			case 'USER-DEFINED': {

				if (schemaProperty.enum) {
					schemaProperty.type = typeof list[0];
				} else {
					schemaProperty.type = "object";
					schemaProperty.format = column.udtName;
				}

				break;
			}

			default: {
				//console.warn( 'UNKNOWN TYPE: ' + column.data_type );
				//console.log(column.data_type);
				//console.log(column);
				schemaProperty.type = column.dataType;
			}
				break;
		}

		if (defaultValue && !"default" in schemaProperty) {
			//console.log('setting default ' + defaultValue);
			schemaProperty.default = defaultValue;
		}

		if (column.extra === "auto_increment") {
			schemaProperty.autoIncrement = true;
		}

		if (column.isNullable === "YES") {
			schemaProperty.allowNull = true;
		} else {
			schemaProperty.allowNull = false;
			if (schemaProperty.default === null) {
				delete schemaProperty.default;
			}
		}
		if (column.description) {
			schemaProperty.description = column.description;
		}

		if (column.constraintType === "UNIQUE") {
			schemaProperty.unique = true;
		}

		if (column.isNullable === "NO" && column.columnDefault === null) {
			schemaProperty.required = true;
		}

		if (column.isUpdatable === "NO") {
			schemaProperty.readOnly = true;
		}
		//console.log(column.columnName + " => " + schemaProperty.default);

		return schemaProperty;
	}
}

module.exports = MsSqlSchema;
