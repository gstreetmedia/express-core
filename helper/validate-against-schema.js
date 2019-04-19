let _ = require("lodash");
let validator = require("validator");
let moment = require("moment-timezone");

module.exports = (key, data, schema) => {

	let keyProxy = key.toLowerCase();

	if (data[key] === null && schema.properties[key].allowNull === true) {
		return true;
	} else if (data[key] === null) {
		return false;
	}

	switch (schema.properties[key].type) {
		case "string" :

			if (schema.properties[key].enum &&
				_.indexOf(schema.properties[key].enum, data[key]) === -1) {
				if (data[key] === '') {
					return true;
				}
				return false;
			}

			switch (schema.properties[key].format) {
				case "uuid" :
					try {
						let is = validator.isUUID(data[key]);
						return is;
					} catch (e) {
						return false;
					}

				case "date" :
				case "date-time" :
					try {
						return moment(data[key]).isValid();
					} catch (e) {
						return false;
					}

				default :
					if (keyProxy === "email") {
						try {
							return validator.isEmail(data[key]);
						} catch (e) {
							return false;
						}
					} else if (keyProxy.indexOf("url") !== -1) {
						try {
							return validator.isURL(data[key]);
						} catch (e) {
							return false;
						}
					} else if (keyProxy.indexOf("ipaddress") !== -1) {
						try {
							return validator.isIP(data[key]);
						} catch (e) {
							return false;
						}
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
				case "geometry" :
					return true;
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