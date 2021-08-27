module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "config.json",
	title: "Config",
	dataSource: "default",
	tableName: "_config",
	description: "Generated: Mon Feb 08 2021 16:50:04 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	baseName : "config",
	route : "config",
	properties: {
		id: {
			type: "string",
			format : "uuid",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "id"
		},
		name: {
			type: "string",
			maxLength: 64,
			default: null,
			allowNull: true,
			description: "",
			columnName: "name"
		},
		settings: {
			type: "object",
			default: "{}",
			allowNull: true,
			description: "",
			columnName: "settings"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			allowNull: false,
			description: "",
			columnName: "created_at"
		},
		updatedAt: {
			type: "string",
			format: "date-time",
			default: null,
			allowNull: true,
			description: "",
			columnName: "updated_at"
		}
	},
	required: [
		"createdAt",
		"id"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
