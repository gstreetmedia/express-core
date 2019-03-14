const _ = require("lodash");
const moment = require("moment-timezone");
const validator = require("validator");
/**
 * Convert string to number and numbers to string etc.
 * @param value
 * @param property
 * @returns {*}
 */
module.exports = (value, property) =>{
	if (value === null && property.allowNull === true) {
		return null;
	} else if (value === null) {
		return property.default;
	}

	switch (property.type) {
		case "object" :
			if (_.isString(value) && value !== "") {
				value = JSON.parse(value);
				if (_.isString(value)) {
					value = JSON.parse(value);
				}
			}
			if (_.isObject(value) || _.isArray(value)) {
				return value;
			}
			return null;
			break;
		case "number" :
			if (!_.isNumber(value)) {
				if (property.type && property.type === "integer") {
					value = parseInt(value);
					if (!isNaN(value)) {
						return value;
					}
				} else {
					value = parseFloat(value);
					if (!isNaN(value)) {
						return value;
					}
				}
				return null;
			}
			if (_.isString(value)) {
				if (value === "") {
					return null;
				}
			}
			return value;
			break;
		case "boolean" :
			if (typeof value === "string") {
				return value === "1" || value === "true";
			} else {
				return value;
			}
			break;
		case "string" :

			if (value === '' && property.allowNull === false) {
				return '';
			}
			value = _.isString(value) ? value.trim() : value;
			value = _.isNumber(value) ? "" + value : value;
			if (property.format) {
				switch (property.format) {
					case "date-time" :
						if (value && value !== '') {
							let m = moment(value);
							if (m) {
								return m.toISOString();
								//return m.format("YYYY-MM-DD HH:mm:ss")
							}
						}
						return null;
					case "uuid" :
						if (value === "") {
							return null;
						}
						if (value == null || _.isString(value)) {
							return value;
						}
						break;
					default :
						return value;

				}
			}
			return value;
			break;
	}
	return value;
}