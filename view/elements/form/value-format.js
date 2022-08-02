const numeral = require("numeral");
const moment = require("moment");
const beautify = require("json-beautify");
const _ = require("lodash");

module.exports = function(model, key, value, name) {

	let properties = model.schema.properties;

	if (value === null) {
		return "";
	}

	if (!properties[key]) {
		return value;
	}

	if (!model) {
		console.log("Missing model");
		return value;
	}

	switch (properties[key].type) {
		case "number" :
			if (model.schema.primaryKey !== key && properties[key].format !== "integer") {
				value = value > 0 ? numeral(value).format() : value;
			}
			break;
		case "object" :
			value = beautify(value, null, 2, 80);
			break;
		case "boolean" :
			return value===true ? '<i class="material-icons text-success">done</i>' :
				'<i class="material-icons text-danger">block</i>';
			break;
		case "array" :
			value = beautify(value, null, 2, 80).split(",").join('<br/>');
			break;
		default :
			if (properties[key].format) {
				switch (properties[key].format) {
					case "date-time" :
						value = moment(value).utc().format("MM/DD/YY - HH:mm");
						break;
					case "date" :
						value = moment(value).utc().format("MM/DD/YY");
						break;
					case "uuid" :

				}
			} else {
				if (_.isObject(value)) {
					if (value.name) {
						value = value.name;
					} else if (value.firstName) {
						if (value.lastName) {
							value = value.firstName + " " + value.lastName;
						}
					} else {
						value = JSON.stringify(value)
					}
				}
			}
	}

	if (name) {
		return `<span title="${key + ": " + value}" data-toggle="tooltip" data-placement="bottom">${name}</span>`
	}

	return value;
}
