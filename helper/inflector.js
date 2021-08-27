let inflector = require("inflected");

var exclusions = (value)=> {
	value = value.split("metum").join("meta");
	value = value.split("Metum").join("Meta");
	value = value.split("Medium").join("Media");
	value = value.split("medium").join("Media");
	value = value.split("datum").join("data");
	value = value.split("Datum").join("Data");
	value = value.split("syncs").join("sync");
	value = value.split("Syncs").join("Sync");
	value = value.split("histories").join("History");
	value = value.split("Histories").join("History");
	return value;
};

exports.singularize = function(value) {
	value = inflector.singularize(value);
	return exclusions(value);
};

exports.titleize = (value) => {
	return inflector.titleize(value);
};

exports.underscore = (value) => {
	return inflector.underscore(value);
};

exports.classify = (value) => {
	value = inflector.classify(value);
	return exclusions(value);
};

exports.camelize = (value, titleCase) => {
	return inflector.camelize(value, titleCase);
};

exports.capitalize = (value, titleCase) => {
	return inflector.capitalize(value);
};

exports.tableize = (value, titleCase) => {
	return inflector.tableize(value);
};

exports.pluralize = (value, titleCase) => {
	value = inflector.pluralize(value);
	return exclusions(value);
};

exports.dasherize = (value)=> {
	let newValue = inflector.dasherize(value);
	if (value.indexOf("_") === 0) {
		newValue = "_" + newValue.substring(1, newValue.length);
	}
	return newValue;
};

exports.humanize = (value) => {
	return inflector.humanize(value);
};
