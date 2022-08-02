let fs = require("fs");
let path = require("path");
const checkRequire = require("./check-require");
/**
 * @param {string} router
 * @returns {function}
 */
module.exports = (router) => {

	let coreRouter = router.indexOf("_") === -1 ? "_" + router : router;

	let paths = [
		path.resolve(global.appRoot + '/src/router/' + router + ".js"),
		path.resolve(__dirname + '/../router/' + coreRouter + ".js"),
	];

	while(paths.length > 0) {
		let o = checkRequire(paths[0]);
		if (o) {
			return o;
		}
		paths.shift();
	}

	return null;
}
