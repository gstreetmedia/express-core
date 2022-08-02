
module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "key_store.json",
	title: "Key Store",
	tableName: "_key_store",
	description: "Generated: Tue Nov 09 2021 14:54:20 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	baseName: "key_store",
	route: "_key-store",
	properties : {

		id : {

				type: "string",
				format: "uuid",
				allowNull: false,
				description: "",
				columnName: "id"
		},
		key : {

				type: "string",
				maxLength: 255,
				allowNull: false,
				description: "",
				columnName: "key"
		},
		object : {

				type: "object",
				properties: {},
				allowNull: true,
				description: "",
				columnName: "object"
		},
		createdAt : {

				type: "string",
				format: "date-time",
				allowNull: true,
				description: "",
				columnName: "created_at"
		},
		updatedAt : {

				type: "string",
				format: "date-time",
				allowNull: true,
				description: "",
				columnName: "updated_at"
		},
		ttl : {

				type: "number",
				format: "integer",
				precision: 32,
				allowNull: true,
				description: "",
				columnName: "ttl"
		},
		value : {

				type: "string",
				maxLength: 1000000,
				allowNull: true,
				description: "",
				columnName: "value"
		}
	},
	required : ["id","key"],
	readOnly: ["id"],
	type: "object",
	additionalProperties: false,
	$defs: {}
	}
