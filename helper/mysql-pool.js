let mysql = require('mysql');
let util = require('util');
let connectionStringParser = require("./connection-string-parser")
let md5 = require("md5");
let pools = {};
const sleep = require('util').promisify(setTimeout);


let mysqlPool = async (connectionString) => {

	//console.log(connectionString);

	let key = md5(connectionString);

	if (pools[key]) {
		if (pools[key]._connecting === false && pools[key]._connected === true) {
			return pools[key];
		}
	}

	let cs = connectionStringParser(connectionString);

	//console.log(cs);

	let connection = new mysql.createConnection({
		user: cs.username,
		password: cs.password,
		host: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port,
		connectionLimit : 10
	});

	connection.on('error', err => {
		console.log("pool " + key + " error");
		delete pools[key];
	});

	if (connection._connecting) {
		await sleep(1000);
	}

	pools[key] = connection;

	return {
		query : util.promisify(connection.query).bind(connection)
	};
}

module.exports = mysqlPool;
