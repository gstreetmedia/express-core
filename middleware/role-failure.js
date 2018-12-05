module.exports = function(req, res, next) {

	if (req.roleFailure) {
		console.log("role failure");
		//TODO log failures, perhaps block IP address of continuous failures???
		return res.notAllowed()
	}
	next();
}