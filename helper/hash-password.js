let fs = require("fs");
let path = require("path")
let bcrypt = require('bcrypt');
let passwordFunction;

module.exports = (password) => {
	if (!passwordFunction) {
		if (fs.existsSync(path.resolve(global.appRoot + "/src/helper/hash-password.js"))) {
			passwordFunction = require(global.appRoot + "/src/helper/hash-password")
		} else {
			passwordFunction = (password) => {
				return bcrypt.hashSync(password, process.env.PASSWORD_SALT || process.env.CORE_PASSWORD_SALT);
			}
		}
	}
	return passwordFunction(password);
}

