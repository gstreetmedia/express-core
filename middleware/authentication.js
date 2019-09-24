const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.resolve(__dirname + "/../../middleware/authentication.js"))) {
	let Authentication = require("../model/AuthenticationModel");
	module.exports = async function (req, res, next) {
		try {
			await Authentication.verify(req);
			next();
		} catch (e) {
			console.log(e);
			res.error("Unknown Server Error", 500);
		}
	};

} else {
	module.exports = require(path.resolve(__dirname + "/../../middleware/authentication"))
}