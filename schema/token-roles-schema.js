module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "token_roles.json",
	title: "Token Roles",
	dataSource: "default",
	tableName: "token_roles",
	description: "Generated: Mon Feb 08 2021 16:50:04 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
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
			maxLength: 32,
			allowNull: false,
			description: "",
			columnName: "name"
		},
		roleId: {
			type: "string",
			format : "uuid",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "role_id"
		},
		tokenId: {
			type: "string",
			format : "uuid",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "token_id"
		},
		status: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "status"
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
		"id",
		"name",
		"roleId",
		"tokenId"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
