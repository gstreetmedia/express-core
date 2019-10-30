const listEndpoints = require('express-list-endpoints');
const fs = require("fs");
const inflector = require("./inflector");
const pathToRegexp = require('path-to-regexp');
const _ = require("lodash");

module.exports = (app, options) => {

	let endPoints;
	if (!global.endPoints) {
		endPoints = global.endPoints = listEndpoints(app);
	}

	endPoints = _.clone(endPoints);

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
				organizationKey : {
					type : "apiKey",
					in : "header",
					name : "application-org"
				},
				authorizationBearer : {
					type : "apiKey",
					in : "header",
					name : "authorization"
				}
			}
		},
		security : [
			{
				applicationKey : [],
				applicationSecret : [],
				organizationKey : [],
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
	];
	let query = [
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
			name: "join",
			in: "query",
			description: "A json encoded object of relations to join",
			required: false,
			schema: {
				type: "string"
			}
		}
	];

	endPoints.forEach(
		function (item) {
			let parameters = pathToRegexp.parse(item.path);
			let routeParameters = _.clone(options.parameters);
			let path = "";// + item.path.split(":id").join("{id}");
			let schemaName = parameters[0];
			parameters.forEach(
				(part) => {
					if (typeof part === "string") {
						path += part;
					} else {
						path += part.prefix + "{" + part.name + "}";
					}
				}
			);
			if (path === "/") {
				return;
			}

			let routeKey = parameters[0];
			parameters.shift();

			if (routeKey.indexOf("/admin") === 0) {
				return;
			}


			let root = inflector.pluralize(inflector.underscore(schemaName.split("/")[1]));
			root = root.split("configs").join("config");
			root = root.split("syncs").join("sync");
			root = root.split("metum").join("meta");
			root = root.split("datasets").join("dataset");
			root = inflector.dasherize(root);
			//console.log(root);
			let schemaPath = global.appRoot + "/src/schema/" + root + "-schema.js";


			let schema = null;
			if (fs.existsSync(schemaPath)) {
				schema = require(schemaPath);
				//$schema, $id, dataSource, tableName, primaryKey, updatedAt
				delete schema.$schema;
				delete schema.$id;
				delete schema.createdAt;
				delete schema.id;
				delete schema.dataSource;
				delete schema.tableName;
				delete schema.primaryKey;
				delete schema.updatedAt;
				delete schema.readOnly;
				delete schema.additionalProperties;

				Object.keys(schema.properties).forEach(
					function (key) {
						let obj = schema.properties[key];
						delete obj.allowNull;
						delete obj.columnName;
						delete obj.precision;
						delete obj.cast;
						delete obj.unique;
						if (obj.type === "array") {
							obj.items = {};
						}
						schema.properties[key] = obj;
					}
				);
				obj.components.schemas[root] = schema;
			} else {
				//console.log("Cannot find schema");
				//console.log(schemaPath);
				return;
			}

			parameters.forEach(
				(parameter) => {
					if (_.isObject(parameter)) {
						parameter.in = "path";
						delete parameter.prefix;
						delete parameter.delimiter;
						if (parameter.optional === false) {
							parameter.required = true;
						}
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
						console.log(path + " => " + method + " already exists");
					}

					if (method === "get") {
						if (path.indexOf("{id}") !== -1) {
							obj.paths[path][method].parameters = read.concat(routeParameters);
							if (schema) {
								obj.paths[path][method].responses['200'].content = {
									['application/json']: {
										schema: {"$ref": "#/components/schemas/" + root}
									}
								}
							}
						} else if (path.indexOf("/index") !== -1) {
							obj.paths[path][method].parameters = query.concat(routeParameters);
							if (schema) {
								obj.paths[path].get.responses['200'].content['application/json'].schema = {"$ref": "#/components/schemas/" + root}
							}
						} else if (path.indexOf("search") === -1) {
							obj.paths[path][method].parameters = query.concat(routeParameters);
							if (schema) {
								obj.paths[path][method].responses['200'].content['application/json'].schema = {"$ref": "#/components/schemas/" + root}
							}
						}
					} else if (method === "post" || method === "put" || method === "patch") {
						obj.paths[path][method].parameters = routeParameters;
						if (schema) {
							obj.paths[path][method].requestBody =
								{
									content: {
										['application/json']: {
											schema: {
												"$ref": "#/components/schemas/" + root
											}
										}
									},
									required: true
								};
						}
					} else if (method === "delete") {
						obj.paths[path][method].parameters = routeParameters;
					}
				}
			);
		}
	);

	fs.writeFileSync(global.appRoot + "/swagger.json", JSON.stringify(obj));
}