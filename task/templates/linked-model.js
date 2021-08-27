module.exports = (ModelName, tableName) => {
return `
const ModelBase = require('../core/model/${ModelName}Model');

class ${ModelName}Model extends ModelBase {
	get tableName() {
		return "${tableName}";
	}
}

module.exports = ${ModelName}Model
`
}
