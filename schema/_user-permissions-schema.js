module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "user_permissions.json",
	title: "User Permissions",
	dataSource: "default",
	tableName: "user_permissions",
	description: "Generated: Mon Feb 08 2021 16:50:04 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	baseName : "user_permission",
	route : "user-permission",
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
		userId : {
			type: "string",
			format: "uuid",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "user_id"
		},
		route: {
			type: "string",
			maxLength: 255,
			default: null,
			allowNull: true,
			description: "",
			columnName: "route"
		},
		c: {
			type: "boolean",
			default: false,
			allowNull: true,
			description: "",
			columnName: "c"
		},
		r: {
			type: "boolean",
			default: false,
			allowNull: true,
			description: "",
			columnName: "r"
		},
		u: {
			type: "boolean",
			default: false,
			allowNull: true,
			description: "",
			columnName: "u"
		},
		d: {
			type: "boolean",
			default: false,
			allowNull: true,
			description: "",
			columnName: "d"
		},
		cFields: {
			type: "array",
			format: "string",
			default: null,
			allowNull: true,
			description: "",
			columnName: "c_fields"
		},
		rFields: {
			type: "array",
			format: "string",
			default: null,
			allowNull: true,
			description: "",
			columnName: "r_fields"
		},
		uFields: {
			type: "array",
			format: "string",
			default: null,
			allowNull: true,
			description: "",
			columnName: "u_fields"
		},
		dFields: {
			type: "array",
			format: "string",
			default: null,
			allowNull: true,
			description: "",
			columnName: "d_fields"
		},
		roleId: {
			type: "string",
			format: "uuid",
			maxLength: 36,
			length: 36,
			allowNull: false,
			description: "",
			columnName: "role_id"
		},
		objectId: {
			type: "string",
			format: "uuid",
			maxLength: 36,
			length: 36,
			default: null,
			allowNull: true,
			description: "",
			columnName: "object_id"
		},
		objectType: {
			type: "string",
			maxLength: 64,
			default: null,
			allowNull: true,
			description: "",
			columnName: "object_type"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			default: "now",
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
		"userId"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
