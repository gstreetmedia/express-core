
class MySqlTextToObject {
	/**
	 * Converts the text in a response to either an object or an array based on the property[name].format field
	 * MYSQL recent versions, support JSON, but not varchar[], char[], uuid[], etc
	 * @param model
	 * @param results
	 * @returns {array|object}
	 */
	static convert(model, results) {
		let modelKeys = model.keys;
		let objectKeys = [];
		let boolKeys = [];
		modelKeys.forEach(
			(key) => {
				if (model.properties[key].type === "array" || model.properties[key].type === "object") {
					objectKeys.push(key)
				} else if (model.properties[key].type === "boolean") {
					boolKeys.push(key);
				}
			}
		)

		if (objectKeys.length > 0 || boolKeys.length > 0) {
			results.forEach(
				function (row) {
					objectKeys.forEach(
						(key) => {
							try {
								row[key] = JSON.parse(row[key])
							} catch (e) {

							}
						}
					);
					boolKeys.forEach(
						(key) => {
							row[key] = row[key] === 1
						}
					)
				}
			);
		}

		return results;
	}
}

module.exports = MySqlTextToObject;