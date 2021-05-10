const knex = require('knex');
const fs = require("fs");
const path = require("path");
const cs = require("../helper/connection-string-parser");

module.exports = async(schema, connection) => {

	if (typeof schema === "string") {
		schema = require(path.resolve(__dirname + "/../../schema/", schema + "-schema"));
	}

	let c = cs(connection);

	let builder = knex(
		{
			client: c.client,
			debug : true,
			connection: {
				host : c.host,
				user : c.username,
				password : c.password,
				database : c.database,
				port : c.port
			}
		},
	)

	let hasTable = await builder.schema.hasTable(schema.tableName);

	if (hasTable) {
		console.log("User Table Already Exist");
		return {
			error : {
				message : "Table Already Exists",
				statusCode : 401
			}
		};
	}

	try {
		await builder.schema.createTable(
			schema.tableName,
			(table) => {

				Object.keys(schema.properties).forEach(
					(key) => {
						let columnBuilder;
						let length = schema.properties[key].length ? schema.properties[key].length : schema.properties[key].maxLength;
						let type = schema.properties[key].type;
						let format = schema.properties[key].format;

						switch (schema.properties[key].type) {
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
				)
			}
		);
		return {
			success : true
		}
	} catch (e) {
		console.log(e);
		return {
			error : true,
			statusCode : 500
		}
	}

}
