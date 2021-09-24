let _ = require("lodash");
let validator = require("validator");
let moment = require("moment-timezone");

/**
 *
 * @param {string} key
 * @param {object|string|number|array|boolean} value
 * @param {object} schema
 * @param {string} action (read or write)
 * @returns {{error: {property: *, message: [], value: *, key: *}}|boolean}
 */
let validate = (key, value, schema, action) => {

	let property = schema.properties[key]; //ToDO key a.b.c

	if (!property) {
		return false;
	}

	let type = schema.properties[key].type;
	let format = schema.properties[key].format;
	let valid = false;
	let e = {
		error : {
			message : [],
			key : key,
			value : value,
			property : property
		}
	};

	let error = (message) => {
		e.error.message.push(message);
	}

	if (value === null && property.allowNull === true) {
		return true;
	} else if (value === null) {
		error(`cannot be null`);
	}

	if (required(key, value, schema) === false) {
		error(`is required and cannot be null`);
	}

	switch (type) {
		case "number" :
		case "integer" :
			if (isNaN(value)) {
				error(`not a valid number`);
			}

			let min = property.minimum || null;
			let max = property.maximum || null;
			let exclusiveMaximum = property.exclusiveMaximum === true;
			let exclusiveMinimum = property.exclusiveMinimum === true;
			let multipleOf = property.multipleOf || false;

			if (type === "integer" || format === "integer") {
				valid = _.isInteger(value);
				if (!valid) {
					error(`not a valid integer`);
				}
			} else {
				valid = _.isNumber(value);
				if (!valid) {
					error(`not a valid number`);
				}
			}

			if (valid) {
				if (max) {
					if (exclusiveMaximum && value >= max) {
						error(`number too large ${value} >= ${max}`);
					} else {
						valid = value > max;
						if (!valid) {
							error(`number too large ${value} > ${max}`);
						}
					}
				}
				if (min) {
					if (exclusiveMinimum) {
						valid = value <= min;
						if (!valid) {
							error(`number too small ${value} <= ${min}`);
						}
					} else {
						valid = value < min;
						if (!valid) {
							error(`number too small ${value} < ${min}`);
						}
					}
				}
			}

			if(valid && multipleOf !== false) {
				valid = value % multipleOf > 0;
				if (!valid) {
					error(`number not multiple of ${multipleOf}`);
				}
			}

			return !valid ? e : true;
		case "array" :
			valid = _.isArray(value);
			if (!valid) {
				error(`not a valid array`);
			}
			if (valid && value.length > 0) {
				if (property.format || property.items && (property.items.type || property.items["$ref"])) {
					let sc;
					if (property.format) {
						sc = {
							properties: {
								[key]: {
									type: property.format
								}
							}
						};
					} else if (property.items.type) {
						sc = {
							properties : {
								[key] : {
									type : property.items.type
								}
							}
						};
					} else if (property.items["$ref"]) {
						let k = property.items["$ref"].replace("#/$defs/", "");
						if (schema["$defs"][k]) {
							sc = {
								properties: {
									[k]: schema["$defs"][k]
								}
							};
						}
					}
					if (sc) {
						for (let i = 0; i < value.length; i++) {
							valid = validate(key, value[i], sc, action);
							if (valid !== true) {
								e.concat(valid);
							}
						}
					}
				}
			}
			return !valid ? e : true;
		case "object" :
			switch (format) {
				case "array" :
					valid = _.isArray(value);
					if (!valid) {
						error(`not a valid array`);
					}
					return !valid ? e : true;
				case "geometry" :
					return true;
					//return !valid ? e : true;
				default :
					valid = _.isObject(value);
					if (!valid) {
						error(`not a valid object`);
					}
					if (valid && property.properties) {
						let keys = Object.keys(property.properties);
						for (const key in keys) {
							valid = validate(key, value[key], property, action);
							if (valid === false) {
								return false;
							}
						}
					}
					return !valid ? e : true;
			}
			break;
		case "boolean" :
			valid = _.isBoolean(value);
			if (!valid) {
				error(`not a valid boolean`);
			}
			return !valid ? e : true;
		default : //Assumed to be string
			if (_.isArray(property.enum) && property.enum.includes(value)) {
				return true;
			} else if (_.isArray(property.enum)) {
				if (!valid) {
					error(`not an enumarated value`);
				}
				return !valid ? e : true;
			}

			switch (format) {
				case "uuid" :
					try {
						valid = validator.isUUID(value);
					} catch (e) {
						valid = false;
					}
					if (!valid) {
						error(`not a valid ${format}`);
					}
					break;
				case "date" :
				case "date-time" :
					try {
						valid = moment(value).isValid();
					} catch (e) {
						error(`not a valid ${format}`);
					}
					break;

				case "email" :
				case "idn-email" :
					try {
						valid = validator.isEmail(value);
					} catch (e) {
						valid = false;
					}
					if (!valid) {
						error(`not a valid ${format}`);
					}
					break;
				case "uri" :
				case "uri-reference" :
				case "iri" :
				case "iri-reference" :
					try {
						valid = validator.isURL(value);
					} catch (e) {
						valid = false;
					}
					if (!valid) {
						error(`not a valid ${format}`);
					}
					break;
				case "ipv4" :
				case "ipv6" :
					try {
						valid = validator.isIP(value);
					} catch (e) {
						valid = false;
					}
					if (!valid) {
						error(`not a valid ${format}`);
					}
					break;
				case "hostname" :
				case "idn-hostname" :
					try {
						valid = validator.isFQDN(value);
					} catch (e) {
						valid = false;
					}
					if (!valid) {
						error(`not a valid ${format}`);
					}
					break;
				default :
					valid = typeof value === "string";
					if (!valid) {
						error(`not a valid ${type}`);
					}
					if (valid) {

						let min = property.minlength || null;
						let max = property.maxLength || null;

						if (min) {
							valid = value.length >= min;
							if (!valid) {
								error(`length too short ${value.length} < ${min}`);
							}
						}
						if (max) {
							valid = value.length <= max;
							if (!valid) {
								error(`length too long ${value.length} > ${max}`);
							}
						}
						if (property.pattern) {
							valid = value.matches(property.pattern);
							if (!valid) {
								error(`doesn't match pattern`);
							}
						}
					}
			}
			return !valid ? e : true;
	}
}

let required = (key, value, schema) => {
	let property = schema.properties[key];
	if (schema.required && schema.required.includes(key) && value === null) {
		return false;
	}
	return true;
}

/**
 *
 * @param data
 * @param {JSONSchema} schema
 * @param action
 * @returns {[]|boolean}
 */
let validateObject = (data, schema, action) => {
	let errors = [];
	let warnings = [];
	for (const key in data) {
		if (key in schema.properties) {
			let result = validate(key, data[key], schema, action);
			if (result !== true) {
				errors.push(result);
			}
		} else {
			warnings.push(
				{
					warning : {
						message : "Not a valid property",
						key : key,
						value : data[key]
					}
				}
			)
		}
	}
	return errors.length > 0 ? {errors:errors,warnings:warnings} : true;
}

exports.validateKey = validate;
exports.validateObject = validateObject;
