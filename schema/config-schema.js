module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "config.json",
	title: "Config",
	tableName: "config",
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
		settings: {
			type: "object",
			properties: {},
			description: "",
			columnName: "settings"
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
		}
	},
	required: [
		"id"
	],
	type: "object",
	additionalProperties: false
};