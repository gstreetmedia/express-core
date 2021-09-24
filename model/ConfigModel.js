const ModelBase = require('./ModelBase');

class ConfigModel extends ModelBase {

	get tableName() {
		return "_config";
	}

}

module.exports = ConfigModel;
