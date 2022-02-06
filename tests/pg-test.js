require("./common");
let MySqlSchema = require("../task/PostgresSchema");
let beautify = require("json-beautify");
let fs = require("fs");
let index = async(tableName) => {
	let m = new MySqlSchema(
		{
			connectionString : process.env.PG_DB,
			tablePrefix : ["wp_","aa_"],
			ignoreTables : [],
			tables : [],
			relationMapping : [
				["officeKey", "sourceSystemName"], //if any two tables have these two field hook them up
				["memberKey", "sourceSystemName"]
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
