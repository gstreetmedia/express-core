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
			fieldMapping : [
				['officeKey', 'sourceSystemName'],
				['memberKey', 'sourceSystemName'],
			]
		}
	)

	let tables = await m.getTables();

	while(tables.length > 0) {
		let schema = await m.getSchema(tables[0]);
		fs.writeFileSync(
			global.appRoot + '/src/schema/json/' + schema.tableName + ".json", beautify(schema, null, 2, 100))
		tables.shift();
	}


}
index().then(
	(result) => {
		process.exit();
	}
);
