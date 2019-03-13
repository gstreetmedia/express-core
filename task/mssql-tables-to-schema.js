var _ = require( 'lodash' );
const inflector = require("../helper/inflector");
var fs = require("fs");

var emptySchema = {
	$schema:     'http://json-schema.org/draft-06/schema#',
	id:          '',
	description: '',
	properties:  {},
	required:    [],
	type:        'object'
};



module.exports = async function( options, pool ) {


	let data =  await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_catalog = '"+options.tableName+"'");

	let schema = {};

	data.rows.forEach(
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
					primaryKey : null,
					properties:           {},
					required:             [],
					readOnly:             [],
					type:                 'object',
					additionalProperties: options.additionalProperties === undefined ? false : !!options.additionalProperties
				}
			}
			schema[tableName].properties[columnName] = convertColumnType(column, enums);

			let desc = _.find(descriptions, {table_name:tableName, column_name:columnName});
			//console.log(desc);
			schema[tableName].properties[columnName].description = desc.column_comment || "";

			if (column.constraint_type === "PRIMARY KEY") {
				if (schema[tableName].primaryKey) {
					console.log(tableName + " primary key already set to " + schema[tableName].primaryKey);
				}
				if (columnName.length === 2) {
					schema[tableName].primaryKey = columnName.toLowerCase();
				} else {
					schema[tableName].primaryKey = inflector.camelize(column.column_name, false);
				}
			}

			if (column.constraint_type === "UNIQUE") {
				schema[tableName].properties[columnName].unique = true;
			}

			if ( column.is_nullable === "NO" && column.column_default === null ) {
				schema[tableName].required.push( columnName );
				schema[tableName].required = _.uniq(schema[tableName].required);
			}

			if ( column.is_updatable === "NO") {
				schema[tableName].readOnly.push( columnName );
			}

			if (column.column_default !== null) {
				let def = column.column_default;
				//console.log(def);
				let parts = def.split("::");
				switch (def) {
					case "now()" :
						schema[tableName].properties[columnName].default = "now";
						break;
					default :
						if (parts.length > 0) {
							parts = parts[0].split("'").join("");
							schema[tableName].properties[columnName].default = parts;
						} else {
							schema[tableName].properties[columnName].default = def;
						}

				}
			}
		}
	);

	let schemas = [];

	for (let key in schema) {
		schemas.push(schema[key]);
	}

	return schemas;
}


var convertColumnType = function( column, enums )
{
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
		{
			schemaProperty.type = 'string';
			let list = _.filter(enums, {key: column.table_name + "_" + column.column_name});
			if (list.length > 0) {
				schemaProperty.enum = _.map(list, "value");
			} else {
				list = _.filter(enums, {key: column.column_name});
				if (list.length > 0) {
					schemaProperty.enum = _.map(list, "value");
				}
			}

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
		{
			schemaProperty.type = 'number';
			switch (column.data_type) {
				case 'int':
				case 'smallint':
				case 'bigint':
				case 'integer':
					schemaProperty.format = 'integer';

			}
			if (column.numeric_precision) {
				schemaProperty.precision = column.numeric_precision;
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

		case 'USER-DEFINED':
		{
			let list = [];
			list = _.filter(enums, {key:column.udt_name});
			list = _.map(list, 'value');

			schemaProperty.enum = list;
			schemaProperty.type = typeof list[0];
			break;
		}

		default:
		{
			//console.warn( 'UNKNOWN TYPE: ' + column.data_type );
			//console.log(column);
			schemaProperty.type = column.data_type;
		} break;
	}

	return schemaProperty;
}