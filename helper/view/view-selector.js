let fs = require("fs");
let path = require("path");

module.exports = (res, view, options) => {

	options = options || {};
	let extension = process.env.CORE_TEMPLATE_EXTENSION || "ejs";
	let p = path.resolve(global.appRoot + "/src/views/" + view + "." + extension);
	console.log(p);
	if (fs.existsSync(p)) {
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