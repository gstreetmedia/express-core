module.exports = function(req) {
	let value;
	if (req.headers['x-forwarded-for']) {
		value = req.headers['x-forwarded-for'];
	} else if (req.headers['x-real-ip']) {
		value =  req.headers['x-real-ip'];
	} else if (req.ip) {
		value =  req.ip
	} else if (req.connection.remoteAddress) {
		value =  req.connection.remoteAddress;
	}
	if (value) {
		return value.split(",")[0];
	}

}