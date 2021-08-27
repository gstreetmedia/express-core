let md5 = require("md5");
let pools = {};
const Pool = require("pg").Pool;

module.exports = async (connectionString) => {
	const key = md5(connectionString);

	if (pools[key]) {
		return pools[key];
	}

	let options = {
		connectionString: connectionString,
		max : process.env.CORE_POOL_MAX || require('os').cpus().length * 2 + 1
	};

	let pool = new Pool(options);

	pools[key] = pool;

	return pool
}



