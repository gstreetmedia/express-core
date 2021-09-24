const getView = require("../helper/view/get-view");
const renderView = require("../helper/view/render-view");

/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	let header = await getView("header-admin");
	let footer = await getView("footer-admin");
	let keys = Object.keys(o.schemas).sort();
	return `
${ await renderView(header, o) }  
<!-- List all available Schemas ? -->
<div class="row m-4">
	${keys.map(
		/**
		 * @param {JSONSchema} item
		 * @returns {string}
		 */
		(key) => {
			let schema = o.schemas[key];
			return `
	<div class="col-3 mb-2">
		<a href="/admin/${ schema.tableName }" class="btn btn-dark d-block">${schema.title}</a>
	</div>`
		}
	).join("")}
</div>
${ await renderView(footer, o) }  
`
}
