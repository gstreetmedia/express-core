module.exports = (ControllerName) => {
	return `
	const Model = require("../model/${ControllerName}Model");
const ControllerBase = require('../core/controller/${ControllerName}Controller');

class ${ControllerName}Controller extends ControllerBase {
	constructor() {
		super(Model);
	}
}

module.exports = ${ControllerName}Controller
`
}
