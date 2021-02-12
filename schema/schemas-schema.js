module.exports = {
	$schema: "http://json-schema.org/draft-06/schema#",
	$id: "schemas.json",
	title: "Schema",
	tableName: "_schemas",
	description: "Generated: Sat Dec 15 2018 06:18:11 GMT-0800 (Pacific Standard Time)",
	primaryKey: "id",
	properties: {
		id: {
			type: "string",
			format: "uuid",
			description: "",
			columnName: "id"
		},
		title: {
			type: "string",
			maxLength: 255,
			description: "",
			columnName: "title"
		},
		tableName: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "table_name"
		},
		dataSource: {
			type: "string",
			maxLength: 64,
			description: "",
			columnName: "data_source"
		},

		primaryKey: {
			type: "string",
			maxLength: 64,
			description: "",
			default: "id",
			columnName: "primary_key"
		},
		required: {
			type: "array",
			format: "string",
			description: "",
			columnName: "required"
		},
		properties: {
			type: "object",
			properties: {},
			description: "",
			columnName: "properties"
		},
		readOnly: {
			type: "array",
			format: "string",
			description: "",
			columnName: "read_only"
		},
		relations: {
			type: "object",
			properties: {
				field : {
					type : "object",
					properties : {
						"relation" : {
							type : "string"
						},
						"modelClass" : {
							type : "string"
						},
						"throughClass" : {
							type : "string"
						},
						"join" : {
							type : "object",
							properties : {
								"from" : {
									type : "string"
								},
								through : {
									type : "object",
									properties : {
										"from" : {
											type : "string"
										},
										to : {
											type : "string"
										}
									}
								}
							}
						},
						"where" : {
							type : "object"
						},
						limit : {
							type : "number"
						}
					}
				}
			},
			description: "",
			columnName: "relations"
		},
		updatedAt: {
			type: "string",
			format: "date-time",
			description: "",
			default: "now",
			columnName: "updated_at"
		},
		createdAt: {
			type: "string",
			format: "date-time",
			description: "",
			default: "now",
			columnName: "created_at"
		}
	},
	required: [
		"id",
		"tableName",
		"properties"
	],
	readOnly: [],
	type: "object",
	additionalProperties: false
};
