const inflector = require("./inflector");
const getModel = require("./get-model");

exports.route = (tableName) => {
	let route = tableName;
	let styles = process.env.CORE_ROUTE_NAME_STYLE || "singular,dashed,lowercase";
	styles = styles.split(",");
	styles.forEach(
		(style) => {
			switch (style) {
				case "singular" :
					route = inflector.singularize(route);
					break;
				case "plural" :
					route = inflector.pluralize(route);
					break;
				case "dashed" :
					route = inflector.dasherize(route);
					break;
				case "underscore" :
				case "snake_case" :
					route = inflector.underscore(route);
					break;
				case "camelCase" :
					route = inflector.camelize(route);
					break
				case "TitleCase" :
					route = inflector.camelize(route, true);
					break
				case "lowercase" :
					route = route.toLowerCase();
					break;
			}
		}
	);
	if (route.indexOf("-") === 0) {
		route = "_" + route.substring(1, route.length);
	}
	return route;
}

exports.modelName = (tableName) => {
	return inflector.classify(tableName) + "Model";
}

exports.controllerName = (tableName) => {
	return inflector.classify(tableName) + "Controller";
}

exports.tableFromModel = (modelName) => {
	let table = modelName.replace("Model", "");
	let styles = process.env.CORE_TABLE_STYLE || "plural,dashed,lowercase";
	styles = styles.split(",");
	styles.forEach(
		(style) => {
			switch (style) {
				case "singular" :
					table = inflector.singularize(modelName);
					break;
				case "plural" :
					table = inflector.pluralize(modelName);
					break;
				case "dashed" :
					table = inflector.dasherize(modelName);
					break;
				case "underscore" :
				case "snake_case" :
					table = inflector.underscore(modelName);
					break;
				case "camelCase" :
					table = inflector.camelize(modelName);
					break
				case "TitleCase" :
					table = inflector.camelize(modelName, true);
					break
				case "lowercase" :
					table = modelName.toLowerCase();
					break;
			}
		}
	);
	return modelName;
}

exports.propertyName = (columnName) => {
	let styles = process.env.CORE_COLUMN_NAME_STYLE || "camelCase";
	styles = styles.split(",");
	if (columnName.indexOf("_") !== -1) {
		columnName = columnName.toLowerCase();
	}
	if (!hasLowerCase(columnName) && hasUpperCase(columnName)) {
		columnName = columnName.toLowerCase();
	}
	styles.forEach(
		(style) => {
			switch (style) {
				case "singular" :
					columnName = inflector.singularize(columnName);
					break;
				case "plural" :
					columnName = inflector.pluralize(columnName);
					break;
				case "dashed" :
					columnName = inflector.dasherize(columnName);
					break;
				case "underscore" :
				case "snake_case" :
					columnName = inflector.underscore(columnName);
					break;
				case "camelCase" :
					columnName = inflector.camelize(columnName, false);
					break;
				case "TitleCase" :
					columnName = inflector.camelize(route, true);
					break;
				case "lowercase" :
					columnName = columnName.toLowerCase();
					break;
			}
		}
	);
	return columnName;
}

exports.styles = {
	SINGULAR: "singular",
	CAMEL_CASE: "camelCase",
	PLURAL: "plural",
	DASHED: "dashed",
	UNDERSCORE: "underscore",
	SNAKE_CASE: "snake_case",
	TITLE_CASE: "TitleCase",
	LOWERCASE: "lowercase"
}

let hasLowerCase = (str) => {
	return (/[a-z]/.test(str));
}
let hasUpperCase = (str) => {
	return (/[A-Z]/.test(str));
}
