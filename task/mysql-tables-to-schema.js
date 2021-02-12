const _ = require( 'lodash' );
const inflector = require("../helper/inflector");
const fs = require("fs");
const promisify = (fn) => new Promise((resolve, reject) => fn(resolve));


var emptySchema = {
	$schema:     'http://json-schema.org/draft-06/schema#',
	id:          '',
	description: '',
	properties:  {},
	required:    [],
	type:        'object'
};

module.exports = async function( options, pool )
{

	let data =  await pool.query("SELECT * FROM information_schema.columns WHERE table_schema = '"+options.dbName +"'");



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

	//rows.sort((a,b)=> (a.column_name > b.column_name) ? 1 : -1);

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
					dataSource: null,
					tableName:            tableName,
					description:          'Generated: ' + new Date(),
					primaryKey : null,
					properties:           {},
					required:             [],
					readOnly:             [],
					type:                    'object',
					additionalProperties: options.additionalProperties === undefined ? false : !!options.additionalProperties,
				}
			}
			schema[tableName].properties[columnName] = convertColumnType(column);
			schema[tableName].properties[columnName].description = column.column_comment || '';

			if (column.column_key === "PRI") {
				if (columnName === "ID") {
					schema[tableName].primaryKey = "id";
				} else {
					schema[tableName].primaryKey = inflector.camelize(column.column_name, false);
				}

				if (columnName.length === 2) {
					schema[tableName].primaryKey = columnName.toLowerCase();
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

	//console.log(column.extra);

	var schemaProperty = {
		type: 'null'
	};

	if (column.character_maximum_length) {
		schemaProperty.maxLength = column.character_maximum_length;
	}

	switch( column.data_type )
	{
		case 'text':

		case "character varying":
		case "varchar" :
		case "longtext" :
		case "mediumtext" :
		{
			schemaProperty.type   = 'string';
		} break;

		case 'char':
			schemaProperty.type   = 'string';
			schemaProperty.length = column.character_maximum_length;
			break;
		case 'uuid': {
			schemaProperty.type = 'string';
			schemaProperty.format = 'uuid';
			schemaProperty.length = column.character_maximum_length;
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

	if ("column_default" in column) {
		switch (column.column_default) {
			case "CURRENT_TIMESTAMP" :
			case "current_timestamp()" :
				schemaProperty.default = "now";
				break;
			default :
				schemaProperty.default = column.column_default === "NULL" ? null : column.column_default;
		}
	}

	if (column.extra === "auto_increment") {
		schemaProperty.autoIncrement = true;
	}

	if (column.is_nullable === "YES") {
		schemaProperty.allowNull = true;
	} else {
		schemaProperty.allowNull = false;
		if (schemaProperty.default === null) {
			delete schemaProperty.default;
		}
	}
	if (column.column_key === "UNI") {
		schemaProperty.unique = true;
	}

	return schemaProperty;
}
