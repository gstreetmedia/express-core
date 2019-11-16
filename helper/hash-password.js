let bcrypt = require('bcrypt-nodejs');

module.exports = function(password) {
	return bcrypt.hashSync(password, process.env.JWT_TOKEN_SYSTEM_ID || process.env.CORE_PASSWORD_SALT);
}
