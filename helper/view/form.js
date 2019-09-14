const ejs = require("ejs");
const fs = require("fs");
const moment = require("moment");
const _ = require("lodash");
const now = require("../now");

const elements = require("../../views/elements/form/elements.js");
function findStringType(attribute, attr) {

	if (attribute.enum) {
		attr.options = attribute.enum;
		attr.type = attribute.enum.length > 4 ? "select" : "radio";
		return;
	}

	if (attribute.maxLength > 1000) {
		attr.type = "text-editor";
		return;
	}

	if (attribute.maxLength > 255) {
		attr.type = "text-area";
		return;
	}

	if (attribute.format) {
		switch (attribute.format) {
			case "email" :
				attr.type = "email";
				return;
			case "uuid" :
				attr['data-type'] = 'uuid';
				attr['max'] = 36;
				return;
			case "url" :
				attr.type = "url";
				return;
			case "date" :
				attr.type = "date";
				return;
			case "date-time" :
				attr.type = "datetime-local";
				return;
			case "phone" :
				attr.type = "tel";
				return;
			case "enum" :
				break;
			case "maxLength" :

		}
	}

	if (attr.maxLength > 64) {
		attr.type = "textArea";
		return;
	}

}


function findRefType(attribute, attr) {
	let columnType = attribute.columnType.split(" ")[0];
	switch (columnType) {
		case "date" :
			attr.type = "date";
			break;
		case "timestamp" :
			attr.type = "datetime-local";
			break;
		case "time" :
			attr.type = "time";
			break;
		case "jsonb" :
		case "json" :
			attr.dataType = 'json';
			break;
		case "int" :
			attr.dataType = 'integer';
			break;
		case "decimal" :
			attr.dataType = 'float';
			break;
		case "text" :
			attr.type = "textArea";
			break;
		case "varchar" :
			attr.dataType = 'string';
			break;

	}
}

function createElement(attr) {
	switch (attr.type) {
		case "select" :
			return elements.select(attr);
		case "select-multi" :
			return elements.select(attr, true);
		case "checkbox" :
		case "radio" :
			return elements.checkBoxOrRadio(attr);
		case "checkbox-multi" :
			return elements.checkBoxOrRadio(attr);
		case "text-area" :
			return elements.textArea(attr);
		case "text-editor" :
			return elements.textEditor(attr);
		case "json-editor" :
			return elements.jsonEditor(attr);
		default :
			return elements.input(attr);
	}
}

module.exports = function (model, key, value, lookup) {
	let attribute = model.properties[key];

	if (!attribute) {
		console.log("Cannot find attribute for key => " + key);
		return null;
	}

	if (value === null || value === undefined) {
		switch (attribute.default) {
			case "now" :
				value = now();
				break;
			default :
				if(attribute.default) {
					if (typeof attribute.default === "string") {
						value = attribute.default.split("{").join("{").split("}").join("");
					} else {
						value = attribute.default;
					}

				}
		}
	}

	let attr = {
		type: "text",
		class: "",
		required: "",
		value: value,
		dataType: "",
		maxlength: attribute.maxLength || null,
		minlength: attribute.minLength || null,
		max: attribute.maxLength || null,
		min: attribute.minLength || null,
		name: key,
		id: key + "Field",
		options: attribute.enum || null,
		multiple : false,
		disabled: false,

	};

	if (_.indexOf(model.schema.required, key) !== -1) {
		attr.required = true;
	} else {
		attr.required = false;
	}

	switch (attribute.type) {
		case "string" :
			findStringType(attribute, attr);
			break;
		case "number" :
			attr.type = "number";
			break;
		case "array" :
			attr.value = value ? value.join(",") : '';
			attr.dataType = 'array';
			if (attribute.enum) {
				attr.type = attribute.enum.length > 25 ? "select-multi" : "checkbox";
			} else {
				attr.type = "text";
			}
			attr.multiple = true;
			break;
		case "object" :
			attr.value = JSON.stringify(value);
			attr.dataType = 'string';
			attr.type = "json-editor";
			break;
		case "boolean" :
			attr.type = "radio";
			attr.dataType = 'boolean';
			attr.options = ['true', 'false'];
			break;

	}

	if (attr.type === "date" && typeof attr.value === "object") {
		attr.value = moment(attr.value).format("YYYY-MM-DD");
	} else if (attr.type === "datetime-local" && typeof attr.value === "object") {
		attr.value = moment(attr.value).format("YYYY-MM-DDTHH:mm:ss");
	}

	if (lookup && lookup[key]) {
		attr.options = lookup[key];
		attr.type = attr.options.length < 10 ? "select" : attr.multiple ? "checkbox" : "radio";
		attr.value = value;
	}

	if (key === model.primaryKey) {
		attr.disabled = true;
	}

	if (key === "password") {
		attr.value = '';
		attr.required = false;
	}

	return createElement(attr);
};