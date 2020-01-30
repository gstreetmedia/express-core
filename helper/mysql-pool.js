let mssql = require('mssql');
let util = require('util');
let connectionStringParser = require("./connection-string-parser")
let md5 = require("md5");
let pools = {};
const sleep = require('util').promisify(setTimeout);

module.exports = async (connectionString) => {

	//console.log(connectionString);

	let key = md5(connectionString);

	if (pools[key]) {
		if (pools[key]._connecting === false && pools[key]._connected === true) {
			return pools[key];
		}
	}

	let cs = connectionStringParser(connectionString);

	//console.log(cs);

	let pool = new mssql.ConnectionPool({
		connectionLimit: 10,
		user: cs.username,
		password: cs.password,
		server: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port,
		options: {
			encrypt: true, // Use this if you're on Windows Azure,
			//camelCaseColumns : false
		},
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		}
	});

	pool.connect(
		err => {
			if (err !== null) {
				console.log("removing connection " + key);
				delete pools[key];
			}
		}
	);

	pool.on('error', err => {
		console.log("pool " + key + " error");
		delete pools[key];
	});

	if (pool._connecting) {
		await sleep(1000);
	}

	pools[key] = pool;

	return pool;
}


