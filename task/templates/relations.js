module.exports = (data) => {
	data.relations = data.relations || {};
	data.foreignKeys = data.foreignKeys || {};
	return `
exports.relations = {
${Object.keys(data.relations).map(
		(key) => {
		return `${key} : ${JSON.stringify(data.relations[key])}`	
		}
		).join(",\n")}
}
exports.foreignKeys = {
${Object.keys(data.foreignKeys).map(
		(key) => {
			return `${key} : ${JSON.stringify(data.foreignKeys[key])}`
		}
	).join(",\n")}
}`
}
