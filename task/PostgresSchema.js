const _ = require( 'lodash' );

const fs = require("fs");
const promisify = (fn) => new Promise((resolve, reject) => fn(resolve));
const inflectFromTable = require("../helper/inflect-from-table");
const getPool = require("../model/model-base/pool-postgres");
const SchemaBase = require("./SchemaBase");
const cs = require("../helper/connection-string-parser");
const inflector = require("../helper/inflector")

class PostgresSchema extends SchemaBase{

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

	/**
	 * Returns a list of tables in a DB
	 * @returns {Promise<null|[]>}
	 */
	async getTables() {

		if (this._tables) {
			return this._tables;
		}
		let pool = await getPool(this.options.connectionString);

		let q = `Select isc.table_name
             From information_schema.columns as isc
             where 
             isc.table_schema = 'public' and
			 isc.table_catalog = '${this.cs.database}'`;

		let data =  await pool.query(q);
		data = data.rows;
		let views = await this.getViews();

		let tables = [];
		let ignore = ['geography_columns',
			'geometry_columns',
			'spatial_ref_sys',
			'raster_columns',
			'raster_overviews']
		data.forEach(
			function(row) {
				if (!ignore.includes(row.table_name) && !views.includes(row.table_name)) {
					tables.push(row.table_name);
				}
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
		let pool = await getPool(this.options.connectionString);
		let q =`Select 
			isc.*,
            tc.constraint_type
            From information_schema.columns as isc
            LEFT JOIN information_schema.key_column_usage as kcu on kcu.table_name = isc.table_name and kcu.column_name = isc.column_name
            LEFT JOIN information_schema.table_constraints as tc on tc.constraint_name = kcu.constraint_name
            where isc.table_schema = 'public'
            and isc.table_catalog = '${this.cs.database}'
            and isc.table_name = '${tableName}'`;

		let data = await pool.query(q);
		let columns = this.camelizeArray(data.rows);

		let descriptions = await this.getDescriptions(tableName);
		let enums = await this.getEnums();
		columns.forEach(
			(column) => {
				if (descriptions[column.columnName]) {
					column.description = descriptions[column.columnName]
				}
				if (enums[tableName + "_" + column.columnName]) {
					column.enum = enums[tableName + "_" + column.columnName];
				} else if (enums[column.columnName]) {
					column.enum = enums[column.columnName];
				}
			}
		)

		this._columns[tableName] = columns;
		return this._columns[tableName];
	}

	async getViews() {
		let pool = await getPool(this.options.connectionString);
		let views = await pool.query("SELECT view_name FROM information_schema.view_table_usage");
		views = _.uniq(_.map(views.rows, "view_name"));
		return views;
	}

	async getEnums() {
		if (this._enums) {
			return this._enums;
		}
		let pool = await getPool(this.options.connectionString);
		let enums = await pool.query(
			`SELECT 
       			t.typname as key,
                 e.enumlabel as value
             FROM pg_enum e
                 JOIN pg_type t  ON e.enumtypid = t.oid
		`);

		enums = this.camelizeArray(enums.rows);
		let keys = {};
		enums.forEach(
			(item) => {
				keys[item.key] = keys[item.key] || [];
				if (!keys[item.key].includes(item.value)) {
					keys[item.key].push(item.value);
				}
			}
		)
		this._enums = keys;
		return this._enums;
	}

	async getDescriptions(tableName) {
		if (this._descriptions[tableName]) {
			return this._descriptions[tableName];
		}
		let pool = await getPool(this.options.connectionString);
		let descriptions = await pool.query(`
        SELECT cols.column_name,
               (
                   SELECT pg_catalog.col_description(c.oid, cols.ordinal_position::int)
                   FROM pg_catalog.pg_class c
                   WHERE c.oid = (SELECT ('"' || cols.table_name || '"')::regclass::oid)
                     AND c.relname = cols.table_name
               ) AS column_comment
        FROM information_schema.columns cols
        WHERE cols.table_schema = 'public'
		and cols.table_name = '${tableName}'`);

		descriptions = this.camelizeArray(descriptions.rows);
		let enums = await this.getEnums();
		let keys = {};
		descriptions.forEach(
			(item) => {
				keys[item.columnName] = item.columnComment;
			}
		)

		this._descriptions[tableName] = keys;
		return this._descriptions[tableName];
	}

	/**
	 * Get the primary key for a table, if one exists
	 * @param tableName
	 * @returns {Promise<string>}
	 */
	async getPrimaryKey(tableName) {
		let columns = await this.getColumns(tableName);
		let primaryKey = "id";
		columns.forEach(
			(column) => {
				if (column.constraintType === "PRIMARY KEY") {
					if (column.columnName.length === 2) {
						primaryKey = column.columnName;
					} else {
						primaryKey = column.columnName;
					}
				}
			}
		)
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

module.exports = PostgresSchema;
