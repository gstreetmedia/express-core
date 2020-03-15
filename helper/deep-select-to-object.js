/**
 * Converts object deep selects from results like {"record.param":value} into {record : {param:value}}
 * @param results
 * @returns {*}
 */
module.exports = (results, schema) => {
	let keys = Object.keys(results[0]);
	let hash = {};
	keys.forEach(
		(key) => {
			if (key.indexOf(".") !== -1) {
				let parts = key.split(".");
				hash[key] = hash[key] || {
					field : parts[0],
					subfield : parts[1]
				}
			}
		}
	);
	results.forEach(
		function(row) {
			keys.forEach(
				(key) => {
					if (hash[key]) {
						if (propertySchema[hash[key].subfield]) {
							switch (propertySchema[hash[key].subfield].DataType) {
								case "Decimal" :
								case "Int" :
									row[key] = row[key] !== null ? row[key] = parseFloat(row[key]) : row[key];
									break;
								case "Boolean" :
									row[key] = row[key] === "true";
									break;
							}
						}
						if (hash[key].subfield === "Media" && typeof row[key] === "string") {
							row[key] = JSON.parse(row[key]);
						}
						row[hash[key].field] = row[hash[key].field] || {};
						row[hash[key].field][hash[key].subfield] = row[key];
						delete row[key];
					}
				}
			)
		}
	);
	return results;
}