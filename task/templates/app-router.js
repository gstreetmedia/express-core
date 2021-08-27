const inflectFromTable = require("../../helper/inflect-from-table");
const inflector = require("../../helper/inflector");
module.exports = (routers) => {
	return `
let router = require('express').Router();
let routes = {
${routers.map((obj)=>{
	return `    "${inflector.dasherize(obj.tableName)}-router" : "${inflectFromTable.route(obj.baseName)}"`
}).join(",\n")}
};
Object.keys(routes).forEach(
	(key)=> {
        const handler = require("./" + key);
	    const route = "/" + routes[key];
		router.use(route, handler);
	}
);

exports.router = router;
exports.routes = routes;`
};
