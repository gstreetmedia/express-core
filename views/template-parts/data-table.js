let DataTable = require("../elements/DataTable");

module.exports = async(o) => {
	let dt = new DataTable(o);
	return dt.render();
}
