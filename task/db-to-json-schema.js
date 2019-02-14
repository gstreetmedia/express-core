require('dotenv').config();
const md5 = require("md5");
const fs = require('fs');
const path = require("path");
const inflector = require("inflected");
const _ = require("lodash");
const connectionStringParser = require("connection-string");
const SchemaModel = require("../model/SchemaModel");
const FieldModel = require("../model/FieldModel")

//used to format output
const stt = require('spaces-to-tabs');
const stringify = require("stringify-object");

let sourceBase = path.resolve(__dirname  + "/../../");

let schemaBase = sourceBase  + "/schema";
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


async function convert(destination, connectionString) {

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

	for (let i = 0; i < connectionString.length; i++) {

		let cs = connectionString[i];

		//console.log(cs);

		if (cs.indexOf("postgresql") === 0) {
			//console.log("postgres");
			converter = require("./pg-tables-to-schema");
		} else if (cs.indexOf("mysql") === 0) {
			//console.log("mysql");
			converter = require("./mysql-tables-to-schema");
		} else {
			//console.log("wtf");
		}

		let schema = await converter({
			"baseUrl": '',
			"indent": 2,
			connectionString : cs
		});

		cs = connectionStringParser(cs);

		schema.forEach(
			function(item) {
				item.dataSource = cs.path[0];
				schemas.push(item);
			}
		)
	}


	// Schema's is an array of json-schema objects
	//
	let routers = [];

	for (let q = 0; q < schemas.length; q++) {
		//schemas.forEach(
		//async function (item) {
		let item = schemas[q];

		if (item.tableName.indexOf("_") === 0) { //private tables
			continue;
		}

		//console.log(item.tableName);

		let keys = [];
		let properties = {};
		let primaryKey = item.primaryKey || "id";
		if (primaryKey === '') {
			primaryKey = 'id';
		}

		for (let key in item.properties) {
			let k = inflector.camelize(key, false);
			if (k.length === 2) {
				k = k.toLowerCase();
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
		let schemaName = schemaBase + "/" + inflector.dasherize(item.tableName).toLowerCase() + "-schema";
		let validationPath = validationBase + "/" + inflector.dasherize(item.tableName).toLowerCase() + "-validation.js";
		let fieldPath = fieldBase + "/" + inflector.dasherize(item.tableName).toLowerCase() + "-fields.js";
		let modelPath = modelBase + "/" + inflector.classify(item.tableName) + "Model.js";
		let controllerPath = controllerBase + "/" + inflector.classify(item.tableName) + "Controller.js";
		let routerPath = routerBase + "/" + inflector.dasherize(item.tableName).toLowerCase() + "-router.js";

		let tableName = item.tableName;
		let result = await schemaModel.set(item.tableName, item);
		let obj = {
			title : item.tableName,
			tableName : item.tableName,
			dataSource : item.dataSource,
			adminIndex : {},
			adminForm : {},
			adminRead : {},
			publicIndex : {},
			publicForm : {},
			publicRead : {},
			status : "active"

		};

		let keysSorted = _.clone(keys).sort(function (a, b) {
			return b.value - a.value;
		});

		keysSorted.forEach(
			function(k) {
				obj.adminIndex[k] = true;
				obj.adminForm[k] = true;
				obj.adminRead[k] = true;
				obj.publicIndex[k] = true;
				obj.publicForm[k] = true;
				obj.publicRead[k] = true;
			}
		);

		await fieldModel.set(tableName, obj);

		if (destination === "memory") {
			global.schemaCache = global.schemaCache || {};
			let name = md5(connectionString.join("::"));
			global.schemaCache[name] = global.schemaCache[name] || {};
			global.schemaCache[name][item.title] = item;
			continue;
		}
		//schemas are always written because the DB can change
		fs.writeFileSync(schemaName + ".js", "module.exports=" +
			stt(stringify(item, {
				indent: '  ',
				singleQuotes: false
			}), 4) + ";");

		if (!fs.existsSync(validationPath)) {
			let s = "let validator = require(\"validator\");\n" +
				"let _ = require(\"lodash\");\n\n" +
				"let validation = {\n" +
				"/*\n" +
				"\tsomeProperty : {\n" +
				"\t\tvalidate: (key, data, schema) => {\n" +
				"\t\t\t//return true or false for some condition\n" +
				"\t\t\treturn true;\n" +
				"\t\t},\n" +
				"\t\tdefault : 'some default value'\n" +
				"\t}\n" +
				"*/\n"
			"};"
			s += "};\n\nmodule.exports = validation;";
			fs.writeFileSync(validationPath, s);
		}

		if (!fs.existsSync(fieldPath)) {
			let s = 'exports.admin = {\n';
			s += "\tindex : [\n\t\t'" + keys.join("',\n\t\t'") + "'\n\t],\n";
			s += "\tform : [\n\t\t{\n\t\t\ttitle:'Fields',\n\t\t\tproperties:[\n\t\t\t\t'" + keys.join("',\n\t\t\t\t'") + "'\n\t\t\t]\n\t\t}\n\t],\n";
			s += "\tread : [\n\t\t{\n\t\t\ttitle:'Fields',\n\t\t\tproperties:[\n\t\t\t\t'" + keys.join("',\n\t\t\t\t'") + "'\n\t\t\t]\n\t\t}\n\t]\n";
			s += "}\n\n";
			s += 'exports.public = {\n';
			s += "\tindex : [\n\t\t'" + keys.join("',\n\t\t'") + "'\n\t],\n";
			s += "\tform : [\n\t\t{\n\t\t\ttitle:'Fields',\n\t\t\tproperties:[\n\t\t\t\t'" + keys.join("',\n\t\t\t\t'") + "'\n\t\t\t]\n\t\t}\n\t],\n";
			s += "\tread : [\n\t\t{\n\t\t\ttitle:'Fields',\n\t\t\tproperties:[\n\t\t\t\t'" + keys.join("',\n\t\t\t\t'") + "'\n\t\t\t]\n\t\t}\n\t]\n";
			s += "}";
			fs.writeFileSync(fieldPath, s);
		}

		if (!fs.existsSync(modelPath)) {
			let s = "const ModelBase = require('../core/model/ModelBase');\n" +
				"const _ = require('lodash');\n" +
				"const schema = require('../schema/" + inflector.dasherize(item.tableName).toLowerCase() + "-schema');\n" +
				"const validation = require('../schema/validation/" + inflector.dasherize(item.tableName).toLowerCase() + "-validation');\n" +
				"const fields = require('../schema/fields/" + inflector.dasherize(item.tableName).toLowerCase() + "-fields');\n\n" +
				"module.exports = class " + inflector.classify(item.tableName) + "Model extends ModelBase {\n\n" +
				"\tconstructor(req) {\n" +
				"\t\tsuper(schema, validation, fields, req);\n" +
				"\t}\n\n" +
				"\tstatic get schema() { return schema; }\n\n" +
				"\tstatic get validation() { return validation; }\n\n" +
				"\tstatic get fields() { return fields; }\n\n" +
				"\tasync index(key, value){\n\t\treturn await super.index(key, value);\n\t}\n\n" +
				"\tasync create(data){\n\t\treturn await super.create(data);\n\t}\n\n" +
				"\tasync read(id, query){\n\t\treturn await super.read(id, query);\n\t}\n\n" +
				"\tasync update(id, data, query){\n\t\treturn await super.update(id, data, query);\n\t}\n\n" +
				"\tasync query(query){\n\t\treturn await super.query(query);\n\t}\n\n" +
				"\tasync destroy(id){\n\t\treturn await super.destroy(id);\n\t}\n\n" +
				"}";

			fs.writeFileSync(modelPath, s);
		}

		if (!fs.existsSync(controllerPath)) {
			let s = "const ControllerBase = require('../core/controller/ControllerBase');\n" +
				"const _ = require('lodash');\n" +
				"const Model = require('../model/" + inflector.classify(item.tableName) + "Model');\n\n" +
				"module.exports = class " + inflector.classify(item.tableName) + "Controller extends ControllerBase {\n\n" +
				"\tconstructor() {\n" +
				"\t\tsuper(Model);\n" +
				"\t}\n\n" +
				"\tasync index(req, res){\n\t\treturn await super.index(req, res);\n\t}\n\n" +
				"\tasync create(req, res){\n\t\treturn await super.create(req, res);\n\t}\n\n" +
				"\tasync read(req, res){\n\t\treturn await super.read(req, res);\n\t}\n\n" +
				"\tasync update(req, res){\n\t\treturn await super.update(req, res);\n\t}\n\n" +
				"\tasync query(req, res){\n\t\treturn await super.query(req, res);\n\t}\n\n" +
				"\tasync destroy(req, res){\n\t\treturn await super.destroy(req, res);\n\t}\n\n" +
				"}";

			fs.writeFileSync(controllerPath, s);
		}

		if (!fs.existsSync(routerPath)) {
			let s = "let router = require('express').Router();\n" +
				"let authentication = require('../core/middleware/authentication');\n" +
				"const Controller = require('../controller/" + inflector.classify(item.tableName) + "Controller');\n" +
				"let c = new Controller()\n\n" +
				"router.use(authentication);\n\n" +
				"router.use(async function(req, res, next){\n\treq.allowRole('api-user');\n\t//add other roles as needed, or call req.addRole('some-role') in individual endpoints \n\treturn next();\n});\n\n" +
				"router.get('/index', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.index(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"router.get('/', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.query(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"router.get('/:id', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.read(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"router.post('/', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.create(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"router.put('/:id', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.update(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"router.patch('/:id', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.update(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"router.delete('/:id', async function (req, res, next) {\n" +
				"\tif(req.checkRole()){\n" +
				"\t\treturn await c.delete(req, res);\n\t}\n\treturn next();\n" +
				"});\n\n" +
				"module.exports = router;"

			fs.writeFileSync(routerPath, s);
		}

		routers.push(item.tableName);
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

	return "done";
}

module.exports = convert;