let mssql = require('mysql');
let util = require('util');
let connectionStringParser = require("../../helper/connection-string-parser")
let md5 = require("md5");
let pools = {};
const sleep = require('util').promisify(setTimeout);
const mysqlPool = async (connectionString, count) => {
	count = count || 1;
	let key = md5(connectionString);

	if (pools[key]) {
		if (pools[key]._connecting === false && pools[key]._connected === true) {
			return pools[key];
		}
	}

	let cs = connectionStringParser(connectionString);

	let pool = new mssql.createPool({
		connectionLimit: 10,
		user: cs.username,
		password: cs.password,
		server: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port
	});

	try {
		await pool.connect();
	} catch (e) {
		console.log(e.message);
		if (count > 5) {
			return {
				error : {
					message : "Could not connect to db"
				}
			}
		}
		sleep(500);
		return await mysqlPool(connectionString, count++);
	}

	pool.on('error', err => {
		console.log("pool " + key + " error");
		pool.removeAllListeners("error");
		delete pools[key];
	});

	pools[key] = pool;

	return pool;
}

module.exports = mysqlPool;


