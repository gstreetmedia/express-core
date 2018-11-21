Pool = require("pg").Pool;
Client = require("pg").Client;
pool = new Pool({
	connectionString: process.env.DEFAULT_DB
});

pool.query('SELECT NOW()', (err, res) => {
	//console.log(err, res)
});

module.exports = pool;