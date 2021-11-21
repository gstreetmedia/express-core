var es = require("elasticsearch");
const util = require('util');


let connectionStringParser = require("../../helper/connection-string-parser")
let md5 = require("md5");
let pools = {};

/**
 * @param connectionString
 * @returns {Promise<EsApiClient|*>}
 */
module.exports = async (connectionString) => {
	console.log(connectionString);
	let key ;
	if (typeof connectionString === "object") {
		key = JSON.stringify(connectionString);
	} else {
		key =  md5(connectionString);
	}

	if (pools[key]) {
		return pools[key];
	}
	let cs;

	if (typeof connectionString === "string") {
		cs = connectionStringParser(connectionString);
		console.log(cs);
	} else {
		cs = connectionString;
	}
	let options = {
		host: "https://" + cs.host.replace(":" + cs.port, ""),
		port: cs.port,
		httpAuth: cs.httpAuth || (cs.username + ":" + cs.password),
	};

	let client = new es.Client(options);

	pools[key] = client;

	return client;
}


