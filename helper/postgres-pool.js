let md5 = require("md5");
let pools = {};
const Pool = require("pg").Pool;
const Client = require("pg").Client;

module.exports = (connectionString) => {
	if (pools[md5(connectionString)]) {
		return pools[md5(connectionString)];
	}

	let pool = new Pool({
		connectionString: connectionString
	});

	pools[md5(connectionString)] = pool;

	return pool
}



