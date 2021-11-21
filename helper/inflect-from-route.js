const inflector = require("./inflector");
const getModel = require("./get-model");

exports.table = (route) => {
	let tableName = route;
	let styles = process.env.CORE_TABLE_NAME_STYLE || "snake_case,plural";
	styles = styles.split(",");
	styles.forEach(
		(style) => {
			switch (style) {
				case "singular" :
					tableName = inflector.singularize(tableName);
					break;
				case "plural" :
					tableName = inflector.pluralize(tableName);
					break;
				case "dashed" :
					tableName = inflector.dasherize(tableName);
					break;
				case "underscore" :
				case "snake_case" :
					tableName = inflector.underscore(tableName);
					break;
				case "camelCase" :
					tableName = inflector.camelize(tableName);
					break;
				case "TitleCase" :
					tableName = inflector.camelize(tableName, true);
					break;
				case "lowercase" :
					tableName = tableName.toLowerCase();
					break;
			}
		}
	);
	let intrinsic = ['config', 'fields', 'key_store', 'role', 'role_permissions', 'schema', 'sessions', 'tokens', 'token_permissions', 'users', 'user_permissions', 'user_roles'];
	let _intrinsic = ['_config', '_fields', '_key_store', '_role', '_role_permissions', '_schema', '_sessions', '_tokens', '_token_permissions', '_users', '_user_permissions', '_user_roles'];
	if (intrinsic.includes(tableName) || _intrinsic.includes(tableName)) {
		let M = getModel(tableName);
		if (M) {
			let m = new Model();
			tableName = m.tableName;
		}
	}
	return tableName;
}

exports.styles = {
	SINGULAR: "singular",
	CAMEL_CASE: "camelCase",
	PLURAL: "plural",
	DASHED: "dashed",
	UNDERSCORE: "underscore",
	SNAKE_CASE: "snake_case",
	TITLE_CASE: "TitleCase",
	LOWERCASE: "lowercase"
}
