module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "_history.json",
	title: "History",
	tableName: "_history",
	description: "undefined",
	primaryKey: "id",
	baseName: "undefined",
	route: null,
	properties: {
		id: {
			type: "string",
			format: "uuid",
			allowNull: false,
			columnName: "id",
			description: ""
		},
		field: {
			type: "string",
			allowNull: true,
			maxLength: 64,
			columnName: "field",
			description: ""
		},
		status: {
			enum: ["active", "inactive", "pending", "system-pending", "system-purge", "pending-elastic", "system-inactive"],
			type: "string",
			allowNull: true,
			maxLength: 32,
			columnName: "status",
			description: ""
		},
		toValue: {
			type: "string",
			allowNull: true,
			maxLength: 1000000,
			columnName: "to_value",
			description: ""
		},
		objectId: {
			type: "string",
			format: "uuid",
			allowNull: false,
			columnName: "object_id",
			description: ""
		},
		createdAt: {
			type: "string",
			format: "date-time",
			allowNull: false,
			columnName: "created_at",
			description: ""
		},
		fromValue: {
			type: "string",
			allowNull: true,
			maxLength: 1000000,
			columnName: "from_value",
			description: ""
		},
		updatedAt: {
			type: "string",
			format: "date-time",
			allowNull: true,
			columnName: "updated_at",
			description: ""
		},
		byObjectId: {
			type: "string",
			format: "uuid",
			allowNull: false,
			columnName: "by_object_id",
			description: ""
		},
		objectType: {
			type: "string",
			allowNull: false,
			maxLength: 64,
			columnName: "object_type",
			description: ""
		},
		byObjectType: {
			type: "string",
			allowNull: true,
			maxLength: 64,
			columnName: "by_object_type",
			description: ""
		}
	},
	required: ["id", "objectId", "objectType", "byObjectId"],
	readOnly: ["id"],
	type: "object",
	additionalProperties: false,
	$defs: {}
}
