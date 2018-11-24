let bcrypt = require('bcrypt');

module.exports = function(password) {
	return bcrypt.hashSync(password, process.env.PASSWORD_SALT || "1234");
}
