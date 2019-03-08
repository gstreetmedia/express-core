let mysql = require('mssql');
let util = require('util');
let connectionStringParser = require("connection-string");
let md5 = require("md5");
let pools = {};

module.exports = async (connectionString) => {
	if (pools[md5(connectionString)]) {
		return pools[md5(connectionString)];
	}

	let cs = connectionStringParser(connectionString);

	var pool = await mysql.connect({
		connectionLimit: 10,
		user: cs.user,
		password: cs.password,
		server: cs.hosts[0].name, // You can use 'localhost\\instance' to connect to named instance
		database: cs.path[0],
		port : cs.hosts[0].port,
		options: {
			encrypt: true // Use this if you're on Windows Azure
		}
	});

	pools[md5(cs)] = pool;

	return pool;
}
