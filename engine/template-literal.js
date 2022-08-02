let checkRequire = require("../helper/check-require");
let util = require("util");
module.exports = async(filePath, options, callback) => {
	let template = checkRequire(filePath);
	let output;
	try {
		if (util.types.isAsyncFunction(template) || util.types.isPromise(template)) {
			output = await template(options);
		} else {
			output = template(options);
		}
		if (callback) {
			callback(
				null,
				output
			)
		} else {
			return output;
		}
	} catch (e) {
		if (callback) {
			callback(
				e.message,
				null
			)
		} else {
			return {
				error : {
					message : e.message
				}
			};
		}
	}
}
