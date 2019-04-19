let mysql = require('mysql');
let util = require('util');
let connectionStringParser = require("./connection-string-parser")
let md5 = require("md5");
let pools = {};

module.exports = (connectionString) => {
	if (pools[md5(connectionString)]) {
		return pools[md5(connectionString)];
	}

	let cs = connectionStringParser(connectionString);

	var pool = mysql.createPool({
		connectionLimit: 10,
		host : cs.host,
		port : cs.port,
		user : cs.username,
		password : cs.password,
		database : cs.database
	});

	pool.query = util.promisify(pool.query);

	pools[md5(connectionString)] = pool;

	return pool;
}