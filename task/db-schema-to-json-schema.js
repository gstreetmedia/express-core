const SchemaModel = require("../model/SchemaModel");
const sm = new SchemaModel();
const inflector = require("../helper/inflector")
const inflectFromTable = require("../helper/inflect-from-table");
const _ = require("lodash");

module.exports = async (item, options) => {
	let tableName = item.tableName;
	let localSchema = await sm.get(tableName);
	let baseName = item.baseName || item.tableName;

	if (options.removePrefix) {
		if (_.isString(options.removePrefix)) {
			options.removePrefix = [options.removePrefix]
		}
		options.removePrefix.forEach(
			function(item) {
				baseName = baseName.split(item).join("");
			}
		)
	}

	item.title = inflector.titleize(baseName);
	item.route = inflectFromTable.route(baseName);
	item.baseName = baseName;

	let keys = [];
	let properties = {};
	let primaryKey = item.primaryKey || "id";
	if (primaryKey === '') {
		primaryKey = 'id';
	}
	item.primaryKey = primaryKey;

	for (let key in item.properties) {
		//TODO allow developer to choose type, (snake_case, camelCase, PascalCase)

		let propertyName = inflectFromTable.propertyName(key);
		if (propertyName.length === 2) {
			propertyName = propertyName.toLowerCase();
		}

		if (localSchema) { //Allow developer override of property names
			Object.keys(localSchema.properties).forEach(
				function(existingProperyName) {
					//convert to current set standard
					if (item.columnName === localSchema.properties[existingProperyName].columnName) {
						existingProperyName = inflectFromTable.propertyName(existingProperyName)
						if (existingProperyName !== propertyName) {
							propertyName = existingProperyName;
						}
					}
				}
			)
		}
		properties[propertyName] = _.clone(item.properties[key]);
		properties[propertyName].columnName = key;
	}

	for (let i = 0; i < item.required.length; i++) {
		let k = inflectFromTable.propertyName(item.required[i]);
		if (k.length === 2) {
			k = k.toLowerCase();
		}
		item.required[i] = k;
	}

	for (let i = 0; i < item.readOnly.length; i++) {
		let k = inflectFromTable.propertyName(item.readOnly[i]);
		if (k.length === 2) {
			k = k.toLowerCase();
		}
		item.required[i] = k;
	}

	if (localSchema.relations) {
		item.relations = localSchema.relations;
	}

	if (localSchema.foreignKeys) {
		item.foreignKeys = localSchema.foreignKeys;
	}

	item.properties = properties;

	return item;

}
