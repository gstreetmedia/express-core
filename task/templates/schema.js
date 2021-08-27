module.exports = (data) => {
	return `
module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "${data.tableName}.json",
	title: "${data.title}",
	tableName: "${data.tableName}",
	description: "${data.description}",
	primaryKey: "${data.primaryKey}",
	baseName: "${data.baseName}", 
	route: ${data.route ? `"${data.route}"` : `null`},
	properties : {
	${
		Object.keys(data.properties).map(
			(key) => {
				let innerKeys = Object.keys(data.properties[key]);
				
return `
		${key} : {
			${innerKeys.map((k)=>{
				let value;
				switch (typeof data.properties[key]) {
					case "string" :
						value = `"${data.properties[key][k]}"`;
						break;
					case "object" : 
						value = JSON.stringify(data.properties[key][k]);
						break;
					default :
						value = data.properties[key][k];
				}
				return `
				${k}: ${value}`
			}).join(",")}
		}`
		}).join(",")
	}
	},
	required : ${JSON.stringify(data.required)},
	readOnly: ${ data.readOnly.length > 0 ? JSON.stringify(data.readOnly) : "[]"},
	type: "object",
	additionalProperties: false,
	$defs: ${ data.$defs ? JSON.stringify(data.$defs) : "{}"}
	}
	`
};
