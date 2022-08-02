module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "user_meta.json",
	title: "Meta",
	tableName: "_meta",
	description: "Generated: Tue Nov 09 2021 14:54:20 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	route: "_meta",
	properties: {
		id: {
			type: "string",
			format: "uuid",
			allowNull: false,
			description: "",
			columnName: "id",
			unique : true
		},
		key: {
			type: "string",
			maxLength: 255,
			allowNull: true,
			description: "The key (uniquie if isUnique = true)",
			columnName: "key"
		},
		value: {
			type: "string",
			maxLength: 1000000,
			allowNull: true,
			description: "A generic value",
			columnName: "value"
		},
		objectId: {
			type: "string",
			format: "uuid",
			allowNull: false,
			description: "The primary key of the record this item belongs to",
			columnName: "object_id"
		},
		objectType: {
			type: "string",
			maxLength: 255,
			allowNull: false,
			description: "The table this item belongs to",
			columnName: "object_type"
		},
		object: {
			type: "object",
			properties: {},
			allowNull: true,
			description: "",
			columnName: "object"
		},
		isUnique: {
			type: "boolean",
			default: true,
			allowNull: false,
			description: "is true, only one key of this type can exist",
			columnName: "is_unique"
		},
		expiresAt: {
			type: "string",
			format: "date-time",
			allowNull: true,
			description: "The date this key expires (use for long term caching)",
			columnName: "expires_at"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			allowNull: false,
			default : "now",
			description: "",
			columnName: "created_at"
		},
		updatedAt: {
			type: "string",
			format: "date-time",
			allowNull: true,
			description: "",
			columnName: "updated_at"
		}
	},
	required: ["id"],
	readOnly: ["id"],
	type: "object",
	additionalProperties: false,
	$defs: {}
}
