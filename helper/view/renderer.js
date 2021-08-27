module.exports = (page, obj, req, res) => {
	let o = {
		helpers: helpers,
		req: req
	};
	_.extend(o, obj);
	if (fs.existsSync(global.appRoot + "/src/views/" + page + ".js")) {
		//console.log("view override");
		let v = require(global.appRoot + "/src/views/" + page + ".js");
		try {
			let html = v(o);
			res.status(200).send(html);
		} catch (e) {
			res.send(e.message)
		}
	} else if (fs.existsSync(__dirname + "/../views/" + page + ".js")) {
		let v = require(__dirname + "/../views/" + page + ".js");
		try {
			let html = v(o);
			res.status(200).send(html);
		} catch (e) {
			res.send(e.message)
		}
	}
	if (fs.existsSync(global.appRoot + "/src/views/" + page + ".ejs")) {
		//console.log("view override");
		res.render(page, o);
	} else {
		//console.log("view core");
		res.render("../core/views/" + page, o);
	}

}
