let mssql = require('mssql');
let util = require('util');
let connectionStringParser = require("./connection-string-parser")
let md5 = require("md5");
let pools = {};

module.exports = async (connectionString) => {

	let key = md5(connectionString);


	if (pools[key]) {
		return pools[key];
	}

	let cs = connectionStringParser(connectionString);

	console.log(cs);

	var pool = new mssql.ConnectionPool({
		connectionLimit: 10,
		user: cs.username,
		password: cs.password,
		server: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port,
		options: {
			encrypt: true, // Use this if you're on Windows Azure,
			//camelCaseColumns : false
		}
	});

	await pool.connect();

	pools[key] = pool;

	return pool;
}


