module.exports = async function (req, res, next) {
	console.log("middlware/authentication");
	req.addRole("super-admin");
	req.addRole("super-api");
	next();
}