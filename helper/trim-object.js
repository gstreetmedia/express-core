const _ = require("lodash");
function trim(obj) {
	if (_.isString(obj)) {
		return obj.trim();
	} else if (_.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			try {
				obj[i] = trim(obj[i]);
			} catch (e) {
				console.log(e);
			}
		}
	} else if (_.isObject(obj)) {
		for (let key in obj) {
			try {
				obj[key] = trim(obj[key]);
			} catch (e) {
				console.log(e);
			}
		}
	}

	return obj;
}

module.exports = trim;