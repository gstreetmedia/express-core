var redis = require("redis");
const util = require('util');


let connectionStringParser = require("./connection-string-parser")
let md5 = require("md5");
let pools = {};


module.exports = async (connectionString) => {

	let key = md5(connectionString);

	if (pools[key]) {
		return pools[key];
	}

	let cs = connectionStringParser(connectionString);

	let client = new redis.createClient(
		{
			host : cs.host
		}
	);

	client.on('error', err => {
		console.log("pool " + key + " error");
		delete pools[key];
	});

	pools[key] = client;

	return client;
}


