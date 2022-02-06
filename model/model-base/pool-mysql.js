let mssql = require('mysql');
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

	let pool = new mssql.createPool({
		connectionLimit: 10,
		user: cs.username,
		password: cs.password,
		server: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port
	});

	pool.on('error', err => {
		console.log("pool " + key + " error");
		delete pools[key];
	});

	pools[key] = pool;

	let query = (sql) => {
		return new Promise(function (resolve, reject) {
			pool.query(sql,
				(error, results) => {
					if (error) {
						return reject(error);
					}
					return resolve(results);
				}
			)
		});
	};

	return {
		query : query
	};
}


