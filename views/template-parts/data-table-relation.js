let DataTableRelation = require("../elements/DataTableRelation");

module.exports = async(o) => {
	let dt = new DataTableRelation(o);
	return dt.render();
}
