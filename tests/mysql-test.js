require("./common");
let MySqlSchema = require("../task/MySqlSchema");
let beautify = require("json-beautify");
let fs = require("fs");
let index = async(tableName) => {
	let m = new MySqlSchema(
		{
			connectionString : process.env.DEFAULT_DB,
			tablePrefix : ["wp_","aa_"],
			ignoreTables : [],
			tables : [],
			relationMapping : [
				["tableName", "dataSource"], //if any two tables have these two field hook them up
			]
		}
	)

	let tables = await m.getTables();

	while(tables.length > 0) {
		let schema = await m.getSchema(tables[0]);
		await m.saveSchema(schema);
		tables.shift();
	}


}
index().then(
	(result) => {
		process.exit();
	}
);
