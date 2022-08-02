const listEndpoints = require('./get-endpoints');
const fs = require("fs");
const inflectFromTable = require("./inflect-from-table");
const inflectFromRoute = require("./inflect-from-route");
const pathToRegexp = require('path-to-regexp');
const _ = require("lodash");
const ModelBase = require("../model/ModelBase");
const jsonBeautify = require("json-beautify");
const {getDescription} = require("graphql");
const inflector = require("./inflector");

module.exports = async(app, options) => {

	let endPoints;
	if (!global.endPoints) {
		endPoints = global.endPoints = listEndpoints(app);
	}

	endPoints = _.clone(endPoints);

	let SchemaModel = new ModelBase().loadModel("SchemaModel");
	let sm = new SchemaModel();
	await sm.init();
	sm.debug = false;

	let obj = {
		openapi: "3.0.0",
		info: {
			version: options.version,
			title: options.name
		},
		servers: [],
		paths: {},
		components: {
			schemas: {},
			securitySchemes : {
				applicationKey : {
					type : "apiKey",
					in : "header",
					name : "application-key"
				},
				applicationSecret : {
					type : "apiKey",
					in : "header",
					name : "application-secret"
				},
				authorizationBearer : {
					type : "http",
					scheme : "bearer"
				}
			}
		},
		security : [
			{
				applicationKey : [],
				applicationSecret : [],
				authorizationBearer : []
			}
		]
	};

	options.servers.forEach(
		(item) => {
			obj.servers.push(
				{
					url: item
				}
			)
		}
	);

	let read = [
		/*
		{
			name: "select",
			in: "query",
			description: "A json encoded array of fields",
			required: false,
			schema: {
				type: "string"
			}
		},
		{
			name: "join",
			in: "query",
			description: "A json encoded object of relations to join",
			required: false,
			schema: {
				type: "string"
			}
		}
		 */
	];
	let query = [
		/*
		{
			name: "where",
			in: "query",
			description: "A json encoded query",
			required: true,
			schema: {
				type: "string"
			}
		},
		{
			name: "select",
			in: "query",
			description: "A json encoded array of fields",
			required: false,
			schema: {
				type: "string"
			}
		},
		{
			name: "limit",
			in: "query",
			description: "The number of items to get",
			required: false,
			schema: {
				type: "number"
			}
		},
		{
			name: "offset",
			in: "query",
			description: "The number of items to skip",
			required: false,
			schema: {
				type: "number"
			}
		},
		{
			name: "include",
			in: "query",
			description: "A json encoded object of relations to join",
			required: false,
			schema: {
				type: "string"
			}
		}
		 */
	];

	while(endPoints.length > 0) {
		let item = endPoints[0];
		let path = "";
		item.parameters.forEach(
			(part) => {
				if (typeof part === "string") {
					path += part;
				} else {
					path += part.prefix + "{" + part.name + "}";
				}
			}
		);
		let schema;
		if (item.table) {
			schema = await sm.get(item.table);
			if (!schema) {
				schema = await sm.get(item.table.substring(0, item.table.length - 1));
				if (schema) {
					item.table = item.table.substring(0, item.table.length - 1)
				}
			}
		}

		if (schema) {
			let doProps = (sourceProps)=> {
				let properties = {};
				Object.keys(sourceProps).forEach(
					function (key) {
						properties[key] = {
							type : sourceProps[key].type
						};
						if (sourceProps[key].format) {
							properties[key].format = sourceProps[key].format;
						}
						if (sourceProps[key].type === "array") {
							properties[key].items = {};
						}
						if (sourceProps[key].properties) {
							properties[key].properties = doProps(sourceProps[key].properties)
						}
					}
				);
				return properties;
			}

			obj.components.schemas[item.table] = {properties:doProps(schema.properties)};
		} else {

		}

		let routeParameters = [];
		item.parameters.shift();

		item.parameters.forEach(
			(parameter) => {
				parameter = _.clone(parameter);
				if (_.isObject(parameter)) {
					parameter.in = "path";
					delete parameter.prefix;
					delete parameter.delimiter;
					parameter.required = true;
					delete parameter.optional;
					delete parameter.repeat;
					delete parameter.pattern;
					parameter.schema = {
						type: "string"
					}
					if (schema && schema.properties[parameter.name]) {
						parameter.schema.type = schema.properties[parameter.name].type;
						parameter.description = schema.properties[parameter.name].description;
					}
					routeParameters.push(parameter);
				} else {
				}
			}
		);

		if (!obj.paths[path]) {
			obj.paths[path] = {};
		}

		const getSummary = (path, method)=>{

			if (!schema) {
				return "";
			}
			switch (method) {
				case "get" :
					if (path.indexOf("{id}")===-1) {
						return `Query for ${schema.title}`
					}
					return `Read a single ${inflector.singularize(schema.title)}`
				case "post" :
					`Create a ${schema.title}`
				case "put" :
					if (path.indexOf("{id}")===-1) {
						return `Update a group of ${schema.title} by query`
					}
					return `Update a single ${inflector.singularize(schema.title)}`

				case "delete" :
					if (path.indexOf("{id}")===-1) {
						return `Delete a group of ${schema.title} by query`
					}
					return `Delete a single ${inflector.singularize(schema.title)}`
			}
		}

		item.methods.forEach(
			(method) => {
				method = method.toLowerCase();
				if (method === "patch") {
					return;
				}
				if (!obj.paths[path][method]) {
					obj.paths[path][method] = {
						summary: "",
						responses: {
							"200": {
								description: "",
								content: {
									"application/json": {}
								}
							}
						}
					};
				} else {
					//console.log(path + " => " + method + " already exists");
				}

				if (method === "get") {
					if (path.indexOf("{") !== -1) {
						obj.paths[path][method].parameters = read.concat(routeParameters);
						if (schema) {
							obj.paths[path][method].responses['200'].content = {
								['application/json']: {
									schema: {"$ref": "#/components/schemas/" + item.table}
								}
							}
						}
					}
				} else if (method === "post" || method === "put" || method === "patch") {
					obj.paths[path][method].parameters = routeParameters;
					if (schema && typeof item.table !== "undefined" || item.table !== "undefined") {
						obj.paths[path][method].requestBody =
							{
								content: {
									['application/json']: {
										schema: {
											"$ref": "#/components/schemas/" + item.table
										}
									}
								},
								required: true
							};
					}
				} else if (method === "delete") {
					obj.paths[path][method].parameters = routeParameters;
				}
				obj.paths[path][method].summary = getSummary(path, method);
				obj.paths[path][method].security = [{"applicationKey": []}, {"applicationSecret": []}, {"authorizationBearer": []} ]
			}
		);

		endPoints.shift();
	}

	fs.writeFileSync(global.appRoot + "/swagger.json", jsonBeautify(obj, null, 2, 100));
}
