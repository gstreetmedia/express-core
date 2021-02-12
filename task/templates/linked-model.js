module.exports = (ModelName) => {
return `
const ModelBase = require('../core/model/${ModelName}Model');

class ${ModelName}Model extends ModelBase {}

module.exports = ${ModelName}Model
`
}
