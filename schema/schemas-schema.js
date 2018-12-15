module.exports={
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
	dataSource: {
	  type: "string",
	  maxLength: 64,
	  description: "",
	  columnName: "data_source"
	},
	tableName: {
	  type: "string",
	  maxLength: 64,
	  description: "",
	  columnName: "table_name"
	},
	readOnly: {
	  type: "array",
	  format: "string",
	  description: "",
	  columnName: "read_only"
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
	updatedAt: {
	  type: "string",
	  format: "date-time",
	  description: "",
	  default: "now",
	  columnName: "updated_at"
	},
	properties: {
	  type: "object",
	  properties: {},
	  description: "",
	  columnName: "properties"
	},
	title: {
	  type: "string",
	  maxLength: 255,
	  description: "",
	  columnName: "title"
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