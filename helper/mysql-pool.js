var mysql = require('mysql');
var util = require('util');
var connectionStringParser = require("connection-string");
let connectionString = connectionStringParser(process.env.DEFAULT_DB);

var pool = mysql.createPool({
	connectionLimit: 10,
	host : connectionString.hosts[0].name,
	port : connectionString.hosts[0].port,
	user : connectionString.user,
	password : connectionString.password,
	database : connectionString.path[0]
});

pool.query = util.promisify(pool.query);
module.exports = pool;