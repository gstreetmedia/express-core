const numeral = require("numeral");
const moment = require("moment");
const beautify = require("json-beautify");
const _ = require("lodash");

module.exports = function(model, key, value) {


	if (!value) {
		return "";
	}

	if (!model) {
		console.log("Missing model");
		return value;
	}

	if (!model.properties[key]) {
		console.log("Missing Key for " + key);
		return value;
	}

	switch (model.properties[key].type) {
		case "number" :
			value = numeral(value).format();
			break;
		case "object" :
			value = beautify(value, null, 2, 80);
			break;
		case "boolean" :
			value = value
			break;
		default :
			if (model.properties[key].format) {
				switch (model.properties[key].format) {
					case "date-time" :
						value = moment(value).format("MM/DD/YY - HH:mm");
						break;
					case "date" :
						value = moment(value).format("MM/DD/YY");
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

	return value;
}
