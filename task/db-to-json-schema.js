require('dotenv').config();

const fs = require('fs');
const path = require("path");
const inflector = require("../helper/inflector");
const _ = require("lodash");
const connectionStringParser = require("../../core/helper/connection-string-parser");
const SchemaModel = require("../model/SchemaModel");
const FieldModel = require("../model/FieldModel");
const ModelBase = require("../model/ModelBase");

let sourceBase = path.resolve(__dirname + "/../../");
let sourceBaseCore = path.resolve(__dirname + "/../../core/");
let templatePath = path.resolve(__dirname + "/templates");
let inflectFromTable = require("../helper/inflect-from-table");

let schemaBase = sourceBase + "/schema";
//console.log(schemaBase);
if (!fs.existsSync(schemaBase)) {
	fs.mkdirSync(schemaBase);
}

let fieldBase = schemaBase + "/fields";
//console.log(fieldBase);
if (!fs.existsSync(fieldBase)) {
	fs.mkdirSync(fieldBase);
}

let schemaJsonBase = schemaBase + "/json";
//console.log(schemaJsonBase);
if (!fs.existsSync(schemaJsonBase)) {
	fs.mkdirSync(schemaJsonBase);
}

let modelBase = sourceBase + "/model";
let modelBaseCore = sourceBaseCore + "/model";
//console.log(modelBase);
if (!fs.existsSync(modelBase)) {
	fs.mkdirSync(modelBase);
}

let controllerBase = sourceBase + "/controller";
let controllerBaseCore = sourceBaseCore + "/controller";
//console.log(controllerBase);
if (!fs.existsSync(controllerBase)) {
	fs.mkdirSync(controllerBase);
}

let routerBase = sourceBase + "/router";
let routerBaseCore = sourceBaseCore + "/router";
//console.log(routerBase);
if (!fs.existsSync(routerBase)) {
	fs.mkdirSync(routerBase);
}

/*
CORE_PROPERTY_NAME_STYLE=snake_case
CORE_PROPERTY_NAME_PLURAL_STYLE=singular
CORE_TABLE_NAME_STYLE=snake_case,plural

 */
let convertName = (key, style) => {
	style = style || process.env.CORE_PROPERTY_NAME_STYLE || "camelCase";

	switch (style.toLowerCase()) {
		case "camelcase" :
			return inflector.camelize(inflector.underscore(key), false);
		case "pascalcase" :
			return inflector.camelize(inflector.underscore(key), true);
		case "snake_case" :
			return inflector.underscore(key);
		default :
			return key;
	}
}

const sleep = require('util').promisify(setTimeout);
async function convert(connectionString, options) {

	let schemaModel = new SchemaModel();
	//schemaModel.debug = true;
	await schemaModel.getSchema();
	//schemaModel.createTable(); //TODO do this only once

	let fieldModel = new FieldModel();
	//fieldModel.debug = true;
	await schemaModel.getSchema();
	//FieldModel.createTable(); //TODO do this only once

	let converter;

	if (!connectionString) {
		connectionString = [process.env.DEFAULT_DB]
	} else if (!_.isArray(connectionString)) {
		connectionString = [connectionString];
	}

	let cs;
	let routers = [];

	for (let i = 0; i < connectionString.length; i++) {
		let schemas = [];
		let schemaHash = {};

		cs = connectionString[i];
		let pool;

		if (cs.indexOf("postgres") === 0) {
			converter = require("./pg-tables-to-schema");
			pool = await require("../model/model-base/postgres-pool")(connectionString[i]);
		} else if (cs.indexOf("mysql") === 0) {
			converter = require("./mysql-tables-to-schema");
			pool = await require("../model/model-base/mysql-pool")(connectionString[i]);
		} else if (cs.indexOf("mssql") === 0) {
			converter = require("./mssql-tables-to-schema");
			let p = require("../model/model-base/mssql-pool")
			pool = await p(connectionString[i]);
		} //TODO elastic?

		cs = connectionStringParser(cs);

		let schema = await converter(
			_.extend({
				baseUrl: '',
				indent: 2,
				dbName: cs.database,
				connectionString: cs
			}, options[i]), pool);

		schema.forEach(
			function (item) {
				//console.log(item.tableName);
				item.dataSource = cs.database;
				if (options[i].ignore) {
					if (_.indexOf(options[i].ignore, item.tableName) === -1) {
						//console.log("Adding item " + item.tableName);
						return schemas.push(item);
					} else {
						console.log("Not adding item " + item.tableName);
					}
				} else if (options[i].include) {
					if (_.indexOf(options[i].include, item.tableName) !== -1) {
						//console.log("Adding item " + item.tableName);
						return schemas.push(item);
					} else {
						console.log("Not adding item " + item.tableName);
					}
				} else {
					return schemas.push(item);
					//console.log("Adding Item " + item.tableName)
				}
			}
		)

		for (let q = 0; q < schemas.length; q++) {

			let destination = options[i].destination || "file";
			let item = schemas[q];
			let dbSchemaToJsonSchema = require("./db-schema-to-json-schema");
			item = await dbSchemaToJsonSchema(item, options[i]);

			//TODO need to remove schemas that no longer exist
			if (destination === "db") {
				let result = await schemaModel.set(item.tableName, item);
				if (result.error) {
					console.log(result);
					await schemaModel.saveFile(item.tableName, item);
					process.exit();
				}
			} else {
				await schemaModel.saveFile(item.tableName, item);
			}

			let baseName = item.baseName;
			if (schemaHash[baseName]) {
				baseName = item.tableName;
			}

			schemaHash[baseName] = item;

			let keys = _.uniq(Object.keys(item.properties));

			let filtered = keys.filter(
				(value, index, arr) => {
					if (value === item.primaryKey ||
						value === "createdAt" ||
						value === "updatedAt" ||
						value === "name"
					) {
						return false
					}
					return true;
				}
			);

			if (keys.indexOf("name") !== -1) {
				filtered.unshift("name")
			}
			filtered.unshift(item.primaryKey);

			if (keys.indexOf("createdAt") !== -1) {
				filtered.push("createdAt")
			}
			if (keys.indexOf("updatedAt") !== -1) {
				filtered.push("updatedAt")
			}

			keys = filtered;

			let className = inflector.classify(baseName);

			if (!isNaN(parseInt(className))) {
				className = "_" + className;
			}

			let fileRoot = inflector.dasherize(baseName);

			if (!isNaN(parseInt(fileRoot))) {
				fileRoot = "_" + fileRoot;
				if (fileRoot.indexOf("-") === 0) {
					fileRoot = "_" + fileRoot.substring(1, fileRoot.length)
				}
			}

			let controllerPath = controllerBase + "/" + className + "Controller.js";
			let controllerPathCore = controllerBaseCore + "/" + className + "Controller.js";
			let modelPath = modelBase + "/" + className + "Model.js";
			let modelPathCore = modelBaseCore + "/" + className + "Model.js";
			let schemaJsonPath = schemaJsonBase + "/" + fileRoot + "-schema";
			let routerPath = routerBase + "/" + inflector.dasherize(item.tableName) + "-router.js";
			let routerPathCore = routerBaseCore + "/" + fileRoot + "-router.js";



			let fields = await fieldModel.get(item.tableName);

			let fieldSchema = {
				title: inflector.titleize(baseName),
				tableName: item.tableName,
				dataSource: item.dataSource,
				adminIndex: [],
				adminCreate: [],
				adminRead: [],
				adminUpdate: [],
				publicIndex: [],
				publicCreate: [],
				publicRead: [],
				publicUpdate: [],
				status: "active"
			};

			let keysSorted = _.clone(keys);

			if (!fields) {
				keysSorted.forEach(
					function (k) {

						let visible = true;
						if (k === "createdAt" || k === "updatedAt") {
							visible = false;
						}

						fieldSchema.adminIndex.push({
							property: k,
							visible: visible
						});

						fieldSchema.publicIndex.push({
							property: k,
							visible: visible
						});

						visible = true;
						if (k === "id" || k === "createdAt" || k === "updatedAt" || k === item.primaryKey) {
							visible = false;
						}

						fieldSchema.adminCreate.push({
							property: k,
							visible: visible
						});
						fieldSchema.publicCreate.push({
							property: k,
							visible: visible
						});

						fieldSchema.adminUpdate.push({
							property: k,
							visible: visible
						});
						fieldSchema.publicUpdate.push({
							property: k,
							visible: visible
						});

						visible = true;
						if (k === "createdAt" || k === "updatedAt") {
							visible = false;
						}

						fieldSchema.adminRead.push({
							property: k,
							visible: true
						});
						fieldSchema.publicRead.push({
							property: k,
							visible: visible
						});


					}
				);
			} else {
				//console.log(keysSorted);

				//TODO need to keep original sort
				function addKeys(origin, keysSorted) {
					let order = [];

					keysSorted = _.clone(keysSorted);

					//add existing if they still exist

					//console.log(item.tableName + " => " + origin);
					if(_.isArray(fields[origin])) {
						fields[origin].forEach(
							function (item) {
								//console.log("checking " + item.property)
								let index = _.indexOf(keysSorted, item.property);
								if (index !== -1) {
									//console.log("Adding existing field key =>" + item.property);
									fieldSchema[origin].push(item);
									keysSorted.splice(index, 1);
								}
							}
						);
					} else {
						//console.log(fields[origin]);
						//console.log(fields[origin]);
					}

					keysSorted.forEach(
						function (key) {
							//console.log("Adding new field key =>" + key);
							fieldSchema[origin].push(
								{
									property: key,
									visible: true
								}
							)
						}
					);
				}

				addKeys("adminIndex", keysSorted);
				addKeys("adminCreate", keysSorted);
				addKeys("adminRead", keysSorted);
				addKeys("adminUpdate", keysSorted);
				addKeys("publicIndex", keysSorted);
				addKeys("publicCreate", keysSorted);
				addKeys("publicRead", keysSorted);
				addKeys("publicUpdate", keysSorted);
			}

			if (destination === "db") {
				await fieldModel.set(item.tableName, fieldSchema);
			} else {
				await fieldModel.saveFile(item.tableName, fieldSchema);
			}

			fs.writeFileSync(schemaJsonPath + ".json",
				JSON.stringify(item)
			);

			if (options[i].overwrite || !fs.existsSync(modelPath)) {
				let modelName = inflector.classify(baseName);
				let template = require("./templates/model");
				if (fs.existsSync(modelPathCore)) {
					template = require("./templates/linked-model")
				}
				fs.writeFileSync(modelPath, template(modelName, item.tableName));
			}

			if (options[i].overwrite || !fs.existsSync(controllerPath)) {
				let modelName = inflector.classify(baseName);
				let template = require("./templates/controller");
				if (fs.existsSync(controllerPathCore)) {
					template = require("./templates/linked-controller")
				}
				fs.writeFileSync(controllerPath, template(modelName, item.tableName));
			}

			if (options[i].overwrite || !fs.existsSync(routerPath)) {
				let modelName = inflector.classify(baseName);
				let endpoint = inflector.dasherize(inflector.singularize(baseName), false);
				let template = require("./templates/route");
				if (fs.existsSync(routerPathCore)) {
					template = require("./templates/linked-route")
				}
				fs.writeFileSync(routerPath, template(modelName, endpoint));
			}

			routers.push({tableName : item.tableName, baseName:baseName});
		}
	}

	routers.sort();
	routers = _.uniq(routers);

	let template = require("./templates/app-router");
	fs.writeFileSync("./src/router/app-router.js", template(routers));


	console.log("done");
	process.exit();
}

module.exports = convert;
