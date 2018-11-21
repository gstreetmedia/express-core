let moment = require("moment-timezone");

/**
 * Returns a postgres compatible timestamp
 */
module.exports = function() {
	return moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")
}