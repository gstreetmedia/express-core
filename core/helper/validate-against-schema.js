let _ = require("lodash");
let validator = require("validator");

module.exports = (key, data, schema) => {

	let keyProxy = key.toLowerCase();

	switch (schema.properties[key].type) {
		case "string" :
			if (schema.properties[key].enum) {
				return _.indexOf(schema.properties[key].enum, data[key]) >= 0;
			}

			if (!data[key]) {
				return false;
			}

			switch (schema.properties[key].format) {
				case "uuid" :
					try {
						return validator.isUUID(data[key]);
					} catch (e) {
						return false;
					}

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

			if (isNaN(data[key])) {
				return false;
			}

			switch (schema.properties[key].format) {
				case "integer" :
					return _.isInteger(data[key]);
				default :
					return _.isNumber(data[key]);

			}
		case "object" :
			//console.log("checking object " + typeof data[key]);
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