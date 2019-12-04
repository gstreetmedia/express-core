let bcrypt = require('bcrypt-nodejs');

module.exports = function(password) {
	return bcrypt.hashSync(password, process.env.PASSWORD_SALT || process.env.CORE_PASSWORD_SALT);
}
