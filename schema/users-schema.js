module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "users.json",
	title: "Users",
	dataSource: "default",
	tableName: "users",
	description: "Generated: Mon Feb 08 2021 16:50:04 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	properties: {
		id: {
			type: "string",
			format: "uuid",
			maxLength: 36,
			allowNull: false,
			description: "",
			columnName: "id"
		},
		name: {
			type: "string",
			maxLength: 128,
			allowNull: false,
			description: "",
			columnName: "name"
		},
		firstName: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "first_name"
		},
		lastName: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "last_name"
		},
		email: {
			type: "string",
			maxLength: 255,
			allowNull: false,
			unique: true,
			description: "",
			columnName: "email"
		},
		emailChangeCandidate: {
			type: "string",
			maxLength: 255,
			default: null,
			allowNull: true,
			description: "",
			columnName: "email_change_candidate"
		},
		emailProofToken: {
			type: "string",
			maxLength: 255,
			default: null,
			allowNull: true,
			description: "",
			columnName: "email_proof_token"
		},
		emailProofTokenExpiresAt: {
			type: "string",
			format: "date-time",
			default: null,
			allowNull: true,
			description: "",
			columnName: "email_proof_token_expires_at"
		},
		emailStatus: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "email_status"
		},
		password: {
			type: "string",
			maxLength: 64,
			allowNull: false,
			description: "",
			columnName: "password"
		},
		passwordResetToken: {
			type: "string",
			maxLength: 255,
			default: null,
			allowNull: true,
			description: "",
			columnName: "password_reset_token"
		},
		passwordResetTokenExpiresAt: {
			type: "string",
			format: "date-time",
			default: null,
			allowNull: true,
			description: "",
			columnName: "password_reset_token_expires_at"
		},
		phone: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			unique: true,
			description: "",
			columnName: "phone"
		},
		phoneChangeCandidate: {
			type: "string",
			maxLength: 255,
			default: null,
			allowNull: true,
			description: "",
			columnName: "phone_change_candidate"
		},
		phoneProofToken: {
			type: "string",
			maxLength: 255,
			default: null,
			allowNull: true,
			description: "",
			columnName: "phone_proof_token"
		},
		phoneProofTokenExpiresAt: {
			type: "string",
			format: "date-time",
			default: null,
			allowNull: true,
			description: "",
			columnName: "phone_proof_token_expires_at"
		},
		phoneStatus: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "phone_status"
		},
		role: {
			type: "string",
			maxLength: 32,
			allowNull: false,
			description: "",
			columnName: "role"
		},
		status: {
			type: "string",
			maxLength: 32,
			default: null,
			allowNull: true,
			description: "",
			columnName: "status"
		},
		lastLoginAt: {
			type: "string",
			format: "date-time",
			default: null,
			allowNull: true,
			description: "",
			columnName: "last_login_at"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			default: "now",
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
		"email",
		"id",
		"name",
		"password",
		"role"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
