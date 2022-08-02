/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	let header = await o.getView("header-admin");
	let footer = await o.getView("footer-admin");
	let keys = Object.keys(o.schemas).sort();
	return `
${ await o.renderView(header, o) }  
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
${ await o.renderView(footer, o) }  
`
}
