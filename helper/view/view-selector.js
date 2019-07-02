let fs = require("fs");

module.exports = (res, view, options) => {

	options = options || {};
	let extension = process.env.CORE_TEMPLATE_EXTENSION || ".ejs";

	if (fs.existsSync(global.appRoot + "/src/views/" + view + "." + extension)) {
		console.log("Render local login")
		return res.render(
			view,
			options
		)
	} else {
		return res.render(
			'../core/views/' + view,
			options
		)
	}
}