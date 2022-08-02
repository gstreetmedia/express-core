let ViewObject = require("../object/ViewObject");
let pathToReg = require("path-to-regexp");
module.exports = (app) => {
	app.use('*', async (req, res, next) => {

		if (req.locals.notAuthorized) {
			//This request matched a route, but the requester wasn't authorized for it
			return res.status(401).send(req.roleManager.requestPath);
		}

		if (process.env.NODE_ENV !== "production") {
			console.log("Wildcard route -> " + req.roleManager.requestPath);
		}
		let originalUrl = req.roleManager.originalUrl
		let requestPath = req.roleManager.requestPath;
		let path = pathToReg(req.roleManager.originalUrl);
		let extension = requestPath.split(".");
		if (extension.length > 1) {
			switch (extension[extension.length-1]) {
				case "htm" :
				case "html" :
					//TODO Maybe a .js equivalent ? e.g foo/bar/index.html => foo/bar/index.js
				case "css" :
				case "woff" :
				case "ttf" :
				case "js" :
				case "json" :
				case "svg" :
				//TODO Maybe a .js equivalent ? e.g foo/bar/index.{extension} => foo/bar/index.js
				default :
					//TODO add route matching to find pages. Possibly via a _page table
					return res.notFound(
						{
							url : req.roleManager.originalUrl,
							path : path,
							route : req.route,
							currentRoute : req.roleManager.currentRoute
						}
					);
			}
		}

		let o = new ViewObject(
			{
				req : req
			}
		)

		let url = requestPath.indexOf("/") === 0 ? requestPath.substring(1, requestPath.length) : requestPath;
		let views = [url];
		let page = "page-" + url;
		if (url.indexOf("/") !== -1) { //folders
			let parts = url.split("/");
			parts[parts.length-1] = "page-" + parts[parts.length-1];
			page = parts.join("/");
		}
		views.push(page);

		if (req.roleManager.requestPath === "/") {
			views = ['index'];
		}

		let view = await o.getView(Object.assign([],views));
		if (!view.error) { //A view was found, render it
			try {
				return res.html(await o.renderView(view, o));
			} catch (e) {
				//View Failed to Render, JS error?
				res.error(
					{
						error : {
							message : e.message,
							path : path,
							originalUrl : originalUrl
						}
					}
				)
			}
		}

		let r = {
			currentRoute : req.roleManager.currentRoute,
			endPointBase : req.roleManager.endPointBase,
			requestPath : req.roleManager.requestPath,
			route : req.roleManager.route,
			params : req.params,
			views : views
		}

		if (!req.xhr || !req.headers['application-secret']) {
			return res.html(await o.renderView(await o.getView("404"), o), 404);
		}

		return res.notFound(r);

	});
}