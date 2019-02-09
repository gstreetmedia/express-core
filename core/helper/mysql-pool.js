let mysql = require('mysql');
let util = require('util');
let connectionStringParser = require("connection-string");
let md5 = require("md5");
let pools = {};

module.exports = (connectionString) => {
	if (pools[md5(connectionString)]) {
		return pools[md5(connectionString)];
	}

	let cs = connectionStringParser(connectionString);

	var pool = mysql.createPool({
		connectionLimit: 10,
		host : cs.hosts[0].name,
		port : cs.hosts[0].port,
		user : cs.user,
		password : cs.password,
		database : cs.path[0]
	});

	pool.query = util.promisify(pool.query);

	pools[md5(cs)] = pool;

	module.exports = pool;
}