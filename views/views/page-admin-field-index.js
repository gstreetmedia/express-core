const getView = require("../helper/view/get-view");
const renderView = require("../helper/view/render-view");

/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	let header = await getView("header-admin");
	let footer = await getView("footer-admin")

	return `
	${ await renderView(header, o) }  
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
	${ await renderView(footer, o) }  
	`
}
