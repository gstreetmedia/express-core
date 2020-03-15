let SchemaModel = require("../model/SchemaModel");

module.exports = (router, model) => {
	router.get(
		"/schema",
		async (req, res, next) => {
			if (req.checkRole()) {
				let m = new Model();
				let results = m.findOne(
					{
						where : {
							name : model.tableName
						}
					}
				)
				if (req.currentRoles.indexOf("super-admin")) {
					return res.success(results)
				}
			}
		}
	)
	router.get(
		"/schema/create",
		async (req, res, next) => {
			req.allowRole("guest");
			if (req.checkRole()) {
				let m = new Model();
				let results = m.findOne(
					{
						where: {
							name: model.tableName
						}
					}
				)
				if (req.currentRoles.indexOf("super-admin")) {
					return res.success(results.publicCreate)
				}
			}
		}
	)
	router.get(
		"/schema/update",
		async (req, res, next) => {
			req.allowRole("guest");
			if (req.checkRole()) {
				let m = new Model();
				let results = m.findOne(
					{
						where: {
							name: model.tableName
						}
					}
				)
				if (req.currentRoles.indexOf("super-admin")) {
					return res.success(results.publicUpdate)
				}
			}
		}
	)
	router.get(
		"/schema/read",
		async (req, res, next) => {
			req.allowRole("guest");
			if (req.checkRole()) {
				let m = new Model();
				let results = m.findOne(
					{
						where: {
							name: model.tableName
						}
					}
				)
				if (req.currentRoles.indexOf("super-admin")) {
					return res.success(results.publicRead)
				}
			}
		}
	)
}