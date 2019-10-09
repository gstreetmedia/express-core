require('dotenv').config();

const fs = require('fs');
const path = require("path");
const inflector = require("../helper/inflector");
const _ = require("lodash");
const connectionStringParser = require("../helper/connection-string-parser");
const SchemaModel = require("../model/SchemaModel");
const FieldModel = require("../model/FieldModel");
const jsonFix = require("json-beautify");

//used to format output
const stt = require('spaces-to-tabs');
const stringify = require("stringify-object");

let sourceBase = path.resolve(__dirname + "/../../");

let templatePath = path.resolve(__dirname + "/templates");

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

let validationBase = schemaBase + "/validation";
//console.log(validationBase);
if (!fs.existsSync(validationBase)) {
	fs.mkdirSync(validationBase);
}

let modelBase = sourceBase + "/model";
//console.log(modelBase);
if (!fs.existsSync(modelBase)) {
	fs.mkdirSync(modelBase);
}

let controllerBase = sourceBase + "/controller";
//console.log(controllerBase);
if (!fs.existsSync(controllerBase)) {
	fs.mkdirSync(controllerBase);
}

let routerBase = sourceBase + "/router";
//console.log(routerBase);
if (!fs.existsSync(routerBase)) {
	fs.mkdirSync(routerBase);
}


async function convert(destination, connectionString, options) {

	options = options || {};

	let schemaModel = new SchemaModel();
	//schemaModel.createTable(); //TODO do this only once

	let fieldModel = new FieldModel();
	//FieldModel.createTable(); //TODO do this only once

	let converter;
	let schemas = [];

	if (!connectionString) {
		connectionString = [process.env.DEFAULT_DB]
	} else if (!_.isArray(connectionString)) {
		connectionString = [connectionString];
	}

	let cs;

	for (let i = 0; i < connectionString.length; i++) {

		cs = connectionString[i];
		let pool;

		if (cs.indexOf("postgres") === 0) {
			converter = require("./pg-tables-to-schema");
			pool = await require("../helper/postgres-pool")(connectionString[i]);
		} else if (cs.indexOf("mysql") === 0) {
			converter = require("./mysql-tables-to-schema");
			pool = await require("../helper/mysql-pool")(connectionString[i]);
		} else if (cs.indexOf("mssql") === 0) {
			converter = require("./mssql-tables-to-schema");
			let p = require("../helper/mssql-pool")
			pool = await p(connectionString[i]);
		} //TODO elastic?

		cs = connectionStringParser(cs);
		//console.log(cs);

		let schema = await converter(
			_.extend({
				baseUrl: '',
				indent: 2,
				dbName: cs.database,
				connectionString: cs
			}, options), pool);

		schema.forEach(
			function (item) {
				//console.log(item.tableName);
				item.dataSource = cs.database;
				if (options.settings && options.settings[i].ignore) {
					if (_.indexOf(options.settings[i].ignore, item.tableName) === -1) {
						//console.log("Adding item " + item.tableName);
						return schemas.push(item);
					} else {
						console.log("Not adding item " + item.tableName);
					}
				} else if (options.settings && options.settings[i].include) {
					if (_.indexOf(options.settings[i].include, item.tableName) !== -1) {
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

	}


	// Schema's is an array of json-schema objects
	//
	let routers = [];
	let schemaHash = {};

	for (let q = 0; q < schemas.length; q++) {
		let item = schemas[q];

		let existingSchema = await schemaModel.get(item.tableName, false);

		if (item.tableName.indexOf("_") === 0) { //private tables
			//continue;
		}

		let name = item.tableName;

		if (options.removePrefix) {
			if (_.isString(options.removePrefix)) {
				options.removePrefix = [options.removePrefix]
			}
			options.removePrefix.forEach(
				function(item) {
					let tempName = name.split(item).join("");
					if (!schemaHash[tempName]) {
						name = tempName;
					}
				}
			)
		}

		if (schemaHash[name]) {
			name += name + "-" + cs.database
		}

		schemaHash[name] = item;

		item.title = inflector.titleize(name);

		let keys = [];
		let properties = {};
		let primaryKey = item.primaryKey || "id";
		if (primaryKey === '') {
			primaryKey = 'id';
		}

		//TODO we need to see if the column name exist already, but the developer may have changed the property name
		//TODO in this case, we should leave the property name intact
		for (let key in item.properties) {
			//TODO allow developer to choose type, (snake_case, camelCase, PascalCase)
			let k = inflector.camelize(inflector.underscore(key), false);
			if (k.length === 2) {
				k = k.toLowerCase();
			}
			if (existingSchema) { //Allow developer override of property names
				Object.keys(existingSchema.properties).forEach(
					function(propertyName) {
						if (item.columnName === key) {
							if (propertyName !== k) {
								k = propertyName;
							}
						}
					}
				)
			}
			properties[k] = _.clone(item.properties[key]);
			properties[k].columnName = key;
			keys.push(k);
		}

		for (let i = 0; i < item.required.length; i++) {
			let k = inflector.camelize(item.required[i], false);
			if (k.length === 2) {
				k = k.toLowerCase();
			}
			item.required[i] = k;
		}

		keys = _.uniq(keys);
		keys.sort();
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
		item.properties = properties;

		if (name.indexOf("_") === 0) {
			name = name.substring(1, name.length);
		}

		console.log("Name => " + name);

		let schemaName = schemaBase + "/" + inflector.dasherize(name).toLowerCase() + "-schema";
		let validationPath = validationBase + "/" + inflector.dasherize(name).toLowerCase() + "-validation.js";
		let fieldPath = fieldBase + "/" + inflector.dasherize(name).toLowerCase() + "-fields.js";
		let modelPath = modelBase + "/" + inflector.classify(name) + "Model.js";
		let controllerPath = controllerBase + "/" + inflector.classify(name) + "Controller.js";
		let routerPath = routerBase + "/" + inflector.dasherize(name).toLowerCase() + "-router.js";

		let tableName = item.tableName;
		//TODO need to remove schemas that no longer exist
		if (destination !== "file") {
			let result = await schemaModel.set(item.tableName, item);
		}

		let fields = await fieldModel.get(tableName);

		let fieldSchema = {
			title: inflector.titleize(item.tableName),
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
					if (k === "id" || k === "createdAt" || k === "updatedAt" || k === primaryKey) {
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

		if (destination !== "file") {
			await fieldModel.set(tableName, fieldSchema);
		}

		//schemas are always written because the DB can change
		fs.writeFileSync(schemaName + ".js", "module.exports=" +
			stt(stringify(item, {
				indent: '  ',
				singleQuotes: false
			}), 4) + ";");


		if (options.overwrite || !fs.existsSync(fieldPath)) {
			let template = require("./templates/fields");
			let s=template(fieldSchema);
			fs.writeFileSync(fieldPath, s);
		}

		if (options.overwrite || !fs.existsSync(modelPath)) {
			let modelName = inflector.classify(name);
			let template = require("./templates/model");
			fs.writeFileSync(modelPath, template(modelName, tableName));
		}

		if (options.overwrite || !fs.existsSync(controllerPath)) {
			let modelName = inflector.classify(name);
			let template = require("./templates/controller");
			fs.writeFileSync(controllerPath, template(modelName));
		}

		if (options.overwrite || !fs.existsSync(routerPath)) {
			let modelName = inflector.classify(name);
			let endpoint = inflector.dasherize(inflector.singularize(name), false)
			let template = require("./templates/route");
			fs.writeFileSync(routerPath, template(modelName, endpoint));
		}

		routers.push(name);
		//}
		//);
	}

	if (destination === "memory") {
		return;
	}

	routers.sort();

	routers = _.uniq(routers);

	let s = "let router = require('express').Router();\n";
	routers.forEach(
		function (item) {
			s += "const " + inflector.camelize(item, false) + "Router = require('./" + inflector.dasherize(item).toLowerCase() + "-router');\n"
		}
	);

	s += "\n";

	routers.forEach(
		function (item) {
			let ep = inflector.dasherize(inflector.singularize(item), false);
			ep = ep.split("metum").join("meta");
			s += "router.use('/" + ep + "', " + inflector.camelize(item, false) + "Router);\n"
		}
	);

	s += "\n\nmodule.exports = router;\n";

	fs.writeFileSync("./src/router/app-router.js", s);

	console.log("done");
	process.exit();
}

module.exports = convert;