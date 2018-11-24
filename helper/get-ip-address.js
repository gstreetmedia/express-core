module.exports = function(req) {
	if (req.ip) {
		return req.ip
	} else if (req.headers['x-forwarded-for']) {
		return req.headers['x-forwarded-for'];
	} else if (req.headers['x-real-ip']) {
		return req.headers['x-real-ip'];
	} else if (req.connection.remoteAddress) {
		return req.connection.remoteAddress;
	}
}