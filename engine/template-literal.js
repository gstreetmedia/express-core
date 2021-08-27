module.exports = {
	__express : async(filePath, options, callback) => {
		let template = require(filePath);
		let result = template(options);
		if (typeof result === "object") {
			result = await template(options);
		}
		if (callback) {
			callback(
				null,
				result
			)
		} else {
			return result;
		}
	}
}
