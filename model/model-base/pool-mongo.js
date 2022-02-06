const mongodb = require("mongodb");
const util = require('util');
let md5 = require("md5");
let pools = {};
let connectionStringParser = require("../../helper/connection-string-parser")

/**
 *
 * @param connectionString
 * @returns {Promise<Db|*>}
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
	let cs = connectionStringParser(connectionString);
	await client.connect();
	pools[key] = client;

	return client.db(cs.db);
}


