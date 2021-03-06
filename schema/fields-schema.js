module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "_fields.json",
	title: "Fields",
	tableName: "_fields",
	description: "Generated: Tue Feb 12 2019 12:16:22 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	properties: {
		id: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "id"
		},
		tableName: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "table_name"
		},
		publicCreate: {
			type: "object",
			properties: {},
			description: "",
			columnName: "public_create"
		},
		publicUpdate: {
			type: "object",
			properties: {},
			description: "",
			columnName: "public_update"
		},
		dataSource: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "data_source"
		},
		publicIndex: {
			type: "object",
			properties: {},
			description: "",
			columnName: "public_index"
		},
		publicRead: {
			type: "object",
			properties: {},
			description: "",
			columnName: "public_read"
		},
		adminCreate: {
			type: "object",
			properties: {},
			description: "",
			columnName: "admin_create"
		},
		adminUpdate: {
			type: "object",
			properties: {},
			description: "",
			columnName: "admin_update"
		},
		status: {
			type: "string",
			maxLength: 32,
			description: "",
			columnName: "status"
		},
		adminRead: {
			type: "object",
			properties: {},
			description: "",
			columnName: "admin_read"
		},
		updatedAt: {
			type: "string",
			format: "date-time",
			description: "",
			default: "now",
			columnName: "updated_at"
		},
		title: {
			type: "string",
			maxLength: 255,
			description: "",
			columnName: "title"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			description: "",
			default: "now",
			columnName: "created_at"
		},
		adminIndex: {
			type: "object",
			properties: {},
			description: "",
			columnName: "admin_index"
		}
	},
	required: [
		"id",
		"tableName"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false,
	id: "1ce8dde2-e65b-456d-a6e4-7390079d3dc1",
	createdAt: "2019-02-12T20:16:26.892Z"
};