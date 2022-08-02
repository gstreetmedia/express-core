let bcrypt = require('bcrypt-nodejs');

module.exports = (password) => {
	return bcrypt.hashSync(password, process.env.CORE_PASSWORD_SALT || process.env.PASSWORD_SALT);
}

