module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "sessions.json",
	title: "Session",
	tableName: "sessions",
	description: "Generated: Wed Nov 21 2018 07:48:50 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	properties: {
		id: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "id"
		},
		userId: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "user_id"
		},
		token: {
			type: "string",
			description: "",
			columnName: "token"
		},
		ipAddress: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "ip_address"
		},
		userAgent: {
			type: "string",
			description: "",
			columnName: "user_agent"
		},
		expiresAt: {
			type: "string",
			format: "date-time",
			description: "",
			columnName: "expires_at"
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