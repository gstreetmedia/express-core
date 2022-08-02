let md5 = require("md5");
const Pool = require("pg").Pool;

module.exports = async (connectionString, req) => {
	const key = md5(connectionString);

	if (req) {
		req.locals.pool = req.locals.pool || {};
		if (req.locals.pool[key]) {
			return req.locals.pool[key];
		}
	}

	let options = {
		connectionString: connectionString
	};

	if (process.env.CORE_POOL_MAX && !isNaN(parseInt(process.env.CORE_POOL_MAX))) {
		options.max = parseInt(process.env.CORE_POOL_MAX);
	}
	if (process.env.CORE_POOL_IDLE_TIMEOUT && !isNaN(parseInt(process.env.CORE_POOL_IDLE_TIMEOUT))) {
		options.idleTimeoutMillis = parseInt(process.env.CORE_POOL_IDLE_TIMEOUT);
	} else {
		options.idleTimeoutMillis = 10000;
	}
	if (process.env.CORE_POOL_CONNECTION_TIMEOUT && !isNaN(parseInt(process.env.CORE_POOL_CONNECTION_TIMEOUT))) {
		options.connectionTimeoutMillis = parseInt(process.env.CORE_POOL_CONNECTION_TIMEOUT);
	} else {
		options.connectionTimeoutMillis = 10000;
	}

	let pool = new Pool(options);

	if (req) {
		req.locals.pool[key] = pool;
	}

	return pool
}



