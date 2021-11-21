
module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "_log.json",
	title: " Log",
	tableName: "_log",
	description: "Generated: Tue Nov 09 2021 14:54:20 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	baseName: "_log", 
	route: "_log",
	properties : {
	
		id : {
			
				type: "string",
				format: "uuid",
				allowNull: false,
				description: "",
				columnName: "id"
		},
		type : {
			
				type: "string",
				maxLength: 32,
				allowNull: true,
				description: "",
				columnName: "type"
		},
		message : {
			
				type: "string",
				maxLength: 1000000,
				allowNull: true,
				description: "",
				columnName: "message"
		},
		createdAt : {
			
				type: "string",
				format: "date-time",
				allowNull: false,
				description: "",
				columnName: "created_at"
		},
		objectType : {
			
				type: "string",
				format: "uuid",
				allowNull: true,
				description: "",
				columnName: "object_type"
		},
		objectId : {
			
				type: "string",
				format: "uuid",
				allowNull: true,
				description: "",
				columnName: "object_id"
		},
		status : {
			
				type: "string",
				maxLength: 32,
				enum: ["active","inactive","pending","system-pending","system-purge","pending-elastic","system-inactive"],
				allowNull: true,
				description: "",
				columnName: "status"
		},
		updatedAt : {
			
				type: "string",
				format: "date-time",
				allowNull: true,
				description: "",
				columnName: "updated_at"
		}
	},
	required : ["id"],
	readOnly: ["id"],
	type: "object",
	additionalProperties: false,
	$defs: {}
	}
	