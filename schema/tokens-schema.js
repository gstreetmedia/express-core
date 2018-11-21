module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "tokens.json",
	title: "Token",
	tableName: "tokens",
	description: "Generated: Wed Nov 21 2018 07:48:50 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	properties: {
		id: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "id"
		},
		name: {
			type: "string",
			description: "",
			columnName: "name"
		},
		key: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "key"
		},
		secret: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "secret"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			description: "",
			columnName: "created_at"
		},
		updatedAt: {
			type: "string",
			format: "date-time",
			description: "",
			columnName: "updated_at"
		},
		configId: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "config_id"
		}
	},
	required: [
		"id"
	],
	type: "object",
	additionalProperties: false
};