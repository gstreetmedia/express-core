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
			tables : []
		}
	)

	let tables = await m.getTables();

	while(tables.length > 0) {
		//let columns = await m.getColumns(tables[0]);
		//if (tables[0] === "wp_aa_properties") {
			let schema = await m.getSchema(tables[0]);
			//console.log(columns);
			//console.log(schema.relations);
			//console.log(schema.foreignKeys);
			fs.writeFileSync(
				global.appRoot + '/src/schema/json/' + schema.tableName + ".json", beautify(schema, null, 2, 100));
		//}
		tables.shift();
	}


}
index().then(
	(result) => {
		process.exit();
	}
);
