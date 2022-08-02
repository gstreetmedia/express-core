module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "query.json",
	title: "Query",
	description: "The allowable parts of a query",
	properties: {
		where: {
			type: "object",
			description: "",
		},
		select : {
			type : "array"
		},
		limit : {
			type : "number",
			format : "integer"
		},
		offset : {
			type : "number",
			format : "integer"
		},
		sort : {
			type : "array",
			format : "string"
		},
		include : {
			type : "object"
		},
		join : {
			type : "object"
		}
	},
	required: [	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
