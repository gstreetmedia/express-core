let validator = require("validator")

module.exports = (value) => {
	try {
		validator.isUUID(value);
		return "uuid";
	} catch (e) {
	}
	try {
		moment(value).isValid();
		return "date-time";
	} catch (e) {
	}
	try {
		validator.isEmail(value);
		return "email";
	} catch (e) {
	}
	try {
		validator.isURL(value);
		return "uri";
	} catch (e) {

	}
	try {
		validator.isIP(value);
		return "ip";
	} catch (e) {
	}
	try {
		validator.isFQDN(value);
		return "hostname";
	} catch (e) {
		valid = false;
	}
	try {
		validator.isEmail(value);
		return "email";
	} catch (e) {
		valid = false;
	}
	try {
		validator.isMobilePhone(value);
		return "phone";
	} catch (e) {
		valid = false;
	}
}
