module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "user_roles.json",
	title: "User Roles",
	dataSource: "default",
	tableName: "user_roles",
	description: "Generated: Mon Feb 08 2021 16:50:04 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	baseName : "user_role",
	route : "user-role",
	properties: {
		id: {
			type: "string",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "id"
		},
		userId: {
			type: "string",
			format : "uuid",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "user_id"
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
		"roleId",
		"userId",
		"status",
		"createdAt"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
