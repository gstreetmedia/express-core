let _ = require("lodash");
let validator = require("validator");

module.exports = (key, data, schema) => {

	let keyProxy = key.toLowerCase();

	switch (schema.properties[key].type) {
		case "string" :
			switch (schema.properties[key].format) {
				case "uuid" :
					return validator.isUUID(data[key]);
				case "date" :
				case "date-time" :
					if (typeof data[key] === 'string') {
						return true
					}
					return _.isDate(data[key]);
				default :
					if (keyProxy === "email") {
						return validator.isEmail(data[key]);
					} else if (keyProxy.indexOf("url") !== -1) {
						return validator.isURL(data[key]);
					} else if (keyProxy.indexOf("ipaddress") !== -1) {
						return validator.isIP(data[key]);
					} else {
						return _.isString(data[key]);
					}

			}
		case "number" :
			switch (schema.properties[key].format) {
				case "integer" :
					return _.isInteger(data[key]);
				default :
					return _.isNumber(data[key]);

			}
		case "object" :
			switch (schema.properties[key].format) {
				case "array" :
					return _.isArray(data[key]);
				default :
					return _.isObject(data[key]);
			}
			break;
		case "boolean" :
			return _.isBoolean(data[key]);
		default :
			return data[key];
	}
}