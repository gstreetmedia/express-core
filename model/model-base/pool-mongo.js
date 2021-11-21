const mongodb = require("mongodb");
const util = require('util');
let md5 = require("md5");
let pools = {};

/**
 * @param connectionString
 * @returns {Promise<MongoClient|*>}
 */
module.exports = async (connectionString) => {
	let key ;
	if (typeof connectionString === "object") {
		key = JSON.stringify(connectionString);
	} else {
		key =  md5(connectionString);
	}

	if (pools[key]) {
		return pools[key];
	}

	let client = new mongodb.MongoClient(connectionString);
	await client.connect();
	pools[key] = client;

	return client;
}


