var _ = require( 'lodash' );
var inflector = require("inflected");
var fs = require("fs");
const connctionStringParser = require("connection-string");
let connectionString = connctionStringParser(process.env.DEFAULT_DB);
const promisify = (fn) => new Promise((resolve, reject) => fn(resolve));


var emptySchema = {
	$schema:     'http://json-schema.org/draft-06/schema#',
	id:          '',
	description: '',
	properties:  {},
	required:    [],
	type:        'object'
};

let pool = require("../helper/mysql-pool")(process.env.DEFAULT_DB);


module.exports = async function( options )
{

	let data =  pool.query("select * from information_schema.COLUMNS where TABLE_SCHEMA = '" + connectionString.path[0] + "'");

	let rows = [];
	data.forEach(
		function(row) {

			let obj = {};
			Object.keys(row).forEach(
				function(key) {
					obj[key.toLowerCase()] = row[key];
				}
			)
			rows.push(obj);
		}
	)

	let schema = {};

	rows.forEach(
		function(column) {
			var tableName = column.table_name;
			var columnName = column.column_name;

			if (!schema[tableName]) {
				schema[tableName] = {
					$schema:              'http://json-schema.org/draft-06/schema#',
					$id:                  options.baseUrl + tableName + '.json',
					title:                inflector.classify(inflector.singularize(tableName)),
					tableName:            tableName,
					description:          'Generated: ' + new Date(),
					properties:           {},
					required:             [],
					type:                 'object',
					additionalProperties: options.additionalProperties === undefined ? false : !!options.additionalProperties,
				}
			}
			schema[tableName].properties[columnName] = convertColumnType(column);
			schema[tableName].properties[columnName].description = column.col_description || '';

			if (column.column_key === "PRI") {
				if (columnName === "ID") {
					schema[tableName].primaryKey = "id";
				} else {
					schema[tableName].primaryKey = inflector.camelize(column.column_name, false);
				}
			}

			if ( column.is_nullable === "NO" && column.column_default === null ) {
				schema[tableName].required.push( columnName );
			}
		}
	);

	let schemas = [];

	for (let key in schema) {
		schemas.push(schema[key]);
	}


	return schemas;
}


var convertColumnType = function( column )
{

	console.log(column);

	var schemaProperty = {
		type: 'null'
	};

	if (column.character_maximum_length) {
		schemaProperty.maxLength = column.character_maximum_length;
	}

	switch( column.data_type )
	{
		case 'text':
		case '"char"':
		case 'character varying':
		case "varchar" :
		{
			schemaProperty.type   = 'string';
		} break;

		case 'uuid': {
			schemaProperty.type = 'string';
			schemaProperty.format = 'uuid';
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
		case 'bigint':
		case 'integer':
		case 'double precision':
		case 'numeric':
		case 'tinyint' :
		{
			schemaProperty.type = 'number';
			switch (column.data_type) {
				case 'int':
				case 'smallint':
				case 'bigint':
				case 'integer':
					schemaProperty.format = 'integer';

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
		}

		default:
		{
			//console.warn( 'UNKNOWN TYPE: ' + column.data_type );
			//console.log(column);
		} break;
	}

	return schemaProperty;
}
