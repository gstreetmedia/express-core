module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "users.json",
	title: "User",
	tableName: "users",
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
			maxLength: 255,
			description: "",
			columnName: "name"
		},
		firstName: {
			type: "string",
			maxLength: 32,
			description: "",
			columnName: "first_name"
		},
		lastName: {
			type: "string",
			maxLength: 32,
			description: "",
			columnName: "last_name"
		},
		username: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "username"
		},
		email: {
			type: "string",
			maxLength: 255,
			description: "",
			columnName: "email"
		},
		password: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "password"
		},
		role: {
			type: "string",
			maxLength: 32,
			description: "",
			columnName: "role"
		},
		status: {
			type: "string",
			maxLength: 32,
			description: "",
			columnName: "status"
		},
		emailProofToken: {
			type: "string",
			maxLength: 255,
			description: "",
			columnName: "email_proof_token"
		},
		emailProofTokenExpiresAt: {
			type: "string",
			format: "date-time",
			description: "",
			columnName: "email_proof_token_expires_at"
		},
		emailStatus: {
			type: "string",
			maxLength: 32,
			description: "",
			columnName: "email_status"
		},
		emailChangeCandidate: {
			type: "string",
			maxLength: 255,
			description: "",
			columnName: "email_change_candidate"
		},
		passwordResetToken: {
			type: "string",
			maxLength: 255,
			description: "",
			columnName: "password_reset_token"
		},
		passwordResetTokenExpiresAt: {
			type: "string",
			format: "date-time",
			description: "",
			columnName: "password_reset_token_expires_at"
		},
		lastLoginAt: {
			type: "string",
			format: "date-time",
			description: "",
			columnName: "last_login_at"
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
		"id",
		"email",
		"password"
	],
	type: "object",
	additionalProperties: false
};