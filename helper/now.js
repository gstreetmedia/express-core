let moment = require("moment-timezone");

/**
 * Returns a postgres compatible timestamp
 */
module.exports = function() {
	moment().tz("UTC").format("YYYY-MM-DD HH:mm:ss")
}