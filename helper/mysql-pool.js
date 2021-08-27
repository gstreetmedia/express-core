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
		return pools[key];
	}

	let cs = connectionStringParser(connectionString);

	//console.log(cs);

	let connection = new mysql.createPool({
		user: cs.username,
		password: cs.password,
		host: cs.host, // You can use 'localhost\\instance' to connect to named instance
		database: cs.database,
		port : cs.port,
		connectionLimit : !isNaN(parseInt(process.env.CORE_POOL_MAX)) ? parseInt(process.env.CORE_POOL_MAX) : 10
	});

	connection.on('error', err => {
		console.log("pool " + key + " error");
		delete pools[key];
	});

	connection.on('acquire', function (connection) {
		//console.log('Connection %d acquired', connection.threadId);
	});

	pools[key] = {
		query( sql, args ) {
			return util.promisify( connection.query )
				.call( connection, sql, args );
		},
		close() {
			return util.promisify( connection.end ).call( connection );
		},
		connect : connection.connect
	};

	return pools[key];
}

module.exports = mysqlPool;
