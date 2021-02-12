module.exports = (ControllerName) => {
	return `
const ControllerBase = require('../core/controller/${ControllerName}Controller');

class ${ControllerName}Controller extends ControllerBase {}

module.exports = ${ControllerName}Controller
`
}
