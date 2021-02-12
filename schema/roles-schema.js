module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "roles.json",
	title: "Roles",
	dataSource: "default",
	tableName: "roles",
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
		description: {
			type: "string",
			maxLength: 64,
			allowNull: false,
			description: "",
			columnName: "description"
		},
		public: {
			type: "boolean",
			default: true,
			allowNull: true,
			description: "",
			columnName: "public"
		},
		status: {
			type: "string",
			maxLength: 32,
			allowNull: false,
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
		"description",
		"id",
		"name",
		"status"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
