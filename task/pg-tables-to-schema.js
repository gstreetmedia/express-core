var _ = require( 'lodash' );
var inflector = require("inflected");
var fs = require("fs");

var emptySchema = {
	$schema:     'http://json-schema.org/draft-06/schema#',
	id:          '',
	description: '',
	properties:  {},
	required:    [],
	type:        'object'
};



module.exports = async function( options ) {
	let pool;
	if (options.connectionString) {
		pool = require("../helper/postgres-pool")(options.connectionString)
	} else {
		pool = require("../helper/postgres-pool")(process.env.DEFAULT_DB)
	}

	/*
	"\t\tisc.table_name,\n" +
		"\t\tisc.column_name,\n" +
		"\t\tisc.column_default,\n" +
		"\t\tisc.is_nullable,\n" +
		"\t\tisc.character_maximum_length,\n" +
		"\t\tisc.numeric_precision,\n" +
		"\t\tisc.datetime_precision,\n" +
		"\t\tisc.data_type,\n" +
		"\t\tisc.udt_name,\n" +
		"\t\tisc.is_updatable,\n" +
	 */
	let data =  await pool.query("Select\n" +
		" isc.*,\n" +
		//" kcu.*,\n" +
		"    tc.constraint_type\n" +
		"\t\tFrom information_schema.columns as isc\n" +
		"\t\tLEFT JOIN information_schema.key_column_usage as kcu on kcu.table_name = isc.table_name and kcu.column_name = isc.column_name\n" +
		"\t\tLEFT JOIN information_schema.table_constraints as tc on tc.constraint_name = kcu.constraint_name\n" +
		"\t\twhere isc.table_schema ='public'");

	let enums = await pool.query("SELECT\n" +
		"  t.typname as key,\n" +
		"  e.enumlabel as value\n" +
		"FROM pg_enum e\n" +
		"JOIN pg_type t ON e.enumtypid = t.oid");

	enums = enums.rows;

	let views = await pool.query("SELECT view_name FROM information_schema.view_table_usage");
	views = _.map(views.rows, "view_name");

	let descriptions = await pool.query("SELECT\n" +
		//"  cols.table_name,\n" +
		//"  cols.column_name,\n" +
		"  cols.*, " +
		"  (\n" +
		"    SELECT\n" +
		"      pg_catalog.col_description(c.oid, cols.ordinal_position::int)\n" +
		"    FROM\n" +
		"      pg_catalog.pg_class c\n" +
		"    WHERE\n" +
		"      c.oid = (SELECT ('\"' || cols.table_name || '\"')::regclass::oid)\n" +
		"      AND c.relname = cols.table_name\n" +
		"  ) AS column_comment\n" +
		"FROM\n" +
		"  information_schema.columns cols\n" +
		"WHERE\n" +
		"  cols.table_schema = 'public';");

	descriptions = descriptions.rows;

	fs.writeFileSync("./descriptions-" + new Date().getTime() + ".json", JSON.stringify(descriptions));

	let schema = {};

	//TODO need to figure out how to weed out views vs tables
	fs.writeFileSync("./data-" + new Date().getTime() + ".json", JSON.stringify(data));

	data.rows.forEach(
		function(column) {

			if (_.indexOf(views, column.table_name) !== -1) { //don't do views
				return;
			}

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

		case 'ARRAY': {
			schemaProperty.type = 'array';

			switch (column.udt_name) {
				case "_text" :
				case "_varchar" :
					schemaProperty.format = "string";
					break;
				case "_int4" :
					schemaProperty.format = "integer";
				case "_numeric" :
				case "_float8" :
					schemaProperty.format = "number";
				default :
					schemaProperty.format = column.udt_name;
			}

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