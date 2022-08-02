/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	let header = await o.getView("header-admin");
	let footer = await o.getView("footer-admin")

	return `
	${ await o.renderView(header, o) }  
	<div class="row m-4">
		${o.schemas.map(
		(item) => {
			return `
		<div class="col-md-4 mb-2">
			<a href="/admin/fields/<%- item.slug %>" class="btn btn-dark btn-block">${item.modelName}</a>
		</div>
		`
		}).join("")}
	</div>
	${ await o.renderView(footer, o) }  
	`
}
