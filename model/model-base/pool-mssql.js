let mssql = require('mssql');
let util = require('util');
let connectionStringParser = require("../../helper/connection-string-parser")
let md5 = require("md5");
let pools = {};
const sleep = require('util').promisify(setTimeout);

module.exports = async (connectionString) => {

	let key = md5(connectionString);

	if (pools[key]) {
		if (pools[key]._connecting === false && pools[key]._connected === true) {
			return pools[key];
		}
	}

	let cs = connectionStringParser(connectionString);

	let pool = new mssql.ConnectionPool({
		connectionLimit: 10,
		user: cs.username,
		password: cs.password,
		server: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port,
		options: {
			encrypt: true, // Use this if you're on Windows Azure,
			trustServerCertificate: true
		},
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000
		}
	});

	await pool.connect();

	pools[key] = pool;

	return pool;
}


