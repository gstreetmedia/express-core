const RoleManager = require("./RoleManager");

module.exports = (req, res, next) => {
	req.locals = req.locals || {};
	if (!req.locals.roleManager) {
		req.roleManager = req.locals.roleManager = new RoleManager(req);
	}
	req.addRole = (role) => {
		console.warn("please convert req.addRole to req.roleManager.addRole");
		req.roleManager.addRole(role);
	}
	req.checkRole = (role) => {
		console.warn("please convert req.addRole to req.roleManager.addRole");
		req.roleManager.checkRole(role);
	}
	req.allowRole = (role) => {
		console.warn("please convert req.roleManager.allowRole to req.roleManager.allowRole");
		req.roleManager.allowRole(role);
	}
	next();
};
