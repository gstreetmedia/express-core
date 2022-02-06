let md5 = require("md5");
let pools = {};
const Pool = require("pg").Pool;
let clientCount = 0;
const moment = require("moment-timezone");

module.exports = async (connectionString) => {
	const key = md5(connectionString);

	if (pools[key] && moment.tz("UTC").isBefore(pools[key].expiration)) {
		return pools[key].pool;
	} else if (pools[key]) {
		const targetPool = pools[key];
		delete pools[key];
		//console.log(targetPool);
		setTimeout(
			() => {
				targetPool.pool.end(() => {
					console.log('pool has ended ' + targetPool.pool.ended);
					//console.log(targetPool);
				})
			},
			5000
		);
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

	console.log("creating new pool");
	let pool = new Pool(options);

	pool.on('connect', (client) => {
	})

	pool.on('acquire', (client) => {
		//console.log("acquire -> " +  pool.totalCount  + "\r");
	})

	pool.on('remove', (client) => {
		//console.log("remove -> " + pool.totalCount + "\r");
	})

	pool.on('error', (error, client) => {
		//console.log("error");
	})

	pools[key] = {
		pool : pool,
		expiration : moment.tz("UTC").add(10,'minutes')
	};

	return pool
}



