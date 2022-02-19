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

exports.propertyName = (columnName) => {
	let styles = process.env.CORE_COLUMN_NAME_STYLE || "camelCase";
	styles = styles.split(",");
	styles.forEach(
		(style) => {
			switch (style.toLowerCase()) {
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
				case "camelcase" :
					columnName = inflector.camelize(columnName, false);
					break;
				case "titlecase" :
					columnName = inflector.camelize(route, true);
					break;
				case "lowercase" :
					columnName = columnName.toLowerCase();
					break;
			}
		}
	);
	if (columnName === "iD") {
		return "id";
	}
	return columnName;
}

exports.columnName = (propertyName) => {
	let styles = process.env.CORE_DB_NAME_STYLE || "underscore,lowercase";
	styles = styles.split(",");
	styles.forEach(
		(style) => {
			switch (style.toLowerCase()) {
				case "singular" :
					propertyName = inflector.singularize(propertyName);
					break;
				case "plural" :
					propertyName = inflector.pluralize(propertyName);
					break;
				case "dashed" :
					propertyName = inflector.dasherize(propertyName);
					break;
				case "underscore" :
				case "snake_case" :
					propertyName = inflector.underscore(propertyName);
					break;
				case "camelcase" :
					propertyName = inflector.camelize(propertyName, false);
					break;
				case "titlecase" :
					propertyName = inflector.camelize(route, true);
					break;
				case "lowercase" :
					propertyName = propertyName.toLowerCase();
					break;
			}
		}
	);

	return propertyName;
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