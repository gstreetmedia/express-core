let fs = require("fs");
let exists = {};

/**
 * Checks the file system for the existence of code.js, view.js, data.json
 * @param {string} path
 * @returns {null|boolean|any}
 */
module.exports = (path) => {

	//During development, you may add new js file that didn't exist before, but not in production
	if (process.env.NODE_ENV === "production" && exists[path] === false) {
		return false;
	}

	if (exists[path]) {
		//Allows for views to updated without having to restart the server
		if (process.env.NODE_ENV !== "production" && path.indexOf("view/")) {
			delete require.cache[path];
		}
		return require(path);
	}

	if (exists[path] || fs.existsSync(path)) {
		exists[path] = true;
		if (path.indexOf(".json") === path.length - 4) { //path.json
			let data = fs.readFileSync(path);
			try {
				return JSON.parse(data)
			} catch (e) {
				console.warn(path + " contains invalid JSON");
				return null;
			}
		}
		return require(path);
	} else {
		//console.error(path + " does not exist");
	}
	exists[path] = false;
	return null;
}
