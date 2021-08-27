module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "tokens.json",
	title: "Tokens",
	dataSource: "default",
	tableName: "tokens",
	description: "Generated: Mon Feb 08 2021 16:50:04 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	baseName : "token",
	route : "token",
	properties: {
		id: {
			type: "string",
			format: "uuid",
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
		key: {
			type: "string",
			format: "uuid",
			maxLength: 36,
			length: 36,
			default: null,
			allowNull: true,
			description: "",
			columnName: "key"
		},
		secret: {
			type: "string",
			format: "uuid",
			maxLength: 36,
			length: 36,
			default: null,
			allowNull: true,
			description: "TODO this should probably be hashed",
			columnName: "secret"
		},
		status: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "status"
		},
		configId: {
			type: "string",
			format: "uuid",
			maxLength: 36,
			length: 36,
			default: null,
			allowNull: true,
			description: "",
			columnName: "config_id"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			default: null,
			allowNull: true,
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
		"id"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
