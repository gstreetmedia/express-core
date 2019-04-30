let inflector = require("inflected");

exports.singularize = function(value) {
	value = inflector.singularize(value);
	value = value.split("metum").join("meta");
	value = value.split("Metum").join("Meta");
	value = value.split("datum").join("data");
	value = value.split("Datum").join("Data");
	value = value.split("syncs").join("sync");
	value = value.split("Syncs").join("Sync");
	return value;
}

exports.titleize = (value) => {
	return inflector.titleize(value);
}

exports.underscore = (value) => {
	return inflector.underscore(value);
}

exports.classify = (value) => {
	value = inflector.classify(value);
	value = value.split("metum").join("Meta");
	value = value.split("Metum").join("Meta");
	value = value.split("datum").join("Data");
	value = value.split("Datum").join("Data");
	value = value.split("Syncs").join("Sync");
	value = value.split("syncs").join("sync");
	return value;
}

exports.camelize = (value, titleCase) => {
	return inflector.camelize(value, titleCase);
}

exports.capitalize = (value, titleCase) => {
	return inflector.capitalize(value);
}

exports.tableize = (value, titleCase) => {
	return inflector.tableize(value);
}

exports.pluralize = (value, titleCase) => {
	return inflector.pluralize(value);
}

exports.dasherize = (value)=> {
	return inflector.dasherize(value);
}

exports.humanize = (value) => {
	return inflector.humanize(value);
}