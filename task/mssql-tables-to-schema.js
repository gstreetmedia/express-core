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

	let query = "SELECT INFORMATION_SCHEMA.COLUMNS.*,INFORMATION_SCHEMA.TABLE_CONSTRAINTS.CONSTRAINT_TYPE FROM INFORMATION_SCHEMA.COLUMNS\n" +
		"left join INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE on INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE.COLUMN_NAME = INFORMATION_SCHEMA.COLUMNS.COLUMN_NAME and INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE.TABLE_NAME = INFORMATION_SCHEMA.COLUMNS.TABLE_NAME\n" +
		"left join INFORMATION_SCHEMA.TABLE_CONSTRAINTS on INFORMATION_SCHEMA.TABLE_CONSTRAINTS.CONSTRAINT_NAME = INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE.CONSTRAINT_NAME AND INFORMATION_SCHEMA.TABLE_CONSTRAINTS.TABLE_NAME = INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE.TABLE_NAME\n" +
		"WHERE\n" +
		"        INFORMATION_SCHEMA.COLUMNS.TABLE_SCHEMA = 'dbo'";


	let data =  await pool.query(query);

	let schema = {};

	data.recordset.forEach(
		function(item) {
			for(let key in item) {
				item[key.toLowerCase()] = item[key];
				delete item[key];
			}
		}
	)

	data.recordset.forEach(
		function(column) {

			let test = column.table_name.toLowerCase();
			let test2 = column.column_name.toLowerCase()

			if (test2.indexOf("not_used") !== -1) {
				return;
			}
			if (test.indexOf("bak") !== -1) {
				return;
			}
			if (test.indexOf("bk") !== -1) {
				return;
			}
			if (test.indexOf("jk") !== -1) {
				return;
			}
			if (test.indexOf("orange") !== -1) {
				return;
			}
			if (test.indexOf("_bak2") !== -1) {
				return;
			}
			if (test.indexOf("bk2") !== -1) {
				return;
			}
			if (test.indexOf("_done") !== -1) {
				return;
			}


			var tableName = column.table_name;
			var columnName = column.column_name;
			var propertyName = inflector.camelize(inflector.underscore(columnName), false);

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

			schema[tableName].properties[columnName] = convertColumnType(column);

			if (column.constraint_type === "PRIMARY KEY") {
				if (schema[tableName].primaryKey) {
					console.log(tableName + " primary key already set to " + schema[tableName].primaryKey);
				} else {
					schema[tableName].primaryKey = propertyName;
				}
			}

			if (column.constraint_type === "UNIQUE") {
				if (schema[tableName].properties[columnName]) {
					schema[tableName].properties[columnName].unique = true;
				} else {
					console.log("Cannot set unique on " + columnName);
				}
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
		case 'varchar':
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