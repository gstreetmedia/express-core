const getView = require("../helper/view/get-view");
const renderView = require("../helper/view/render-view");

/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {

	let header = await getView("header-admin");
	let footer = await getView("footer-admin");
	let fieldEditor = await getView("template-parts/field-edit-fields");
	return `
	${ await renderView(header, o) }
	<div class="navbar">
		<h5 class="title">${ o.targetModel.schema.title } Fields</h5>
	</div>
	${ fieldEditor(o) } 
	${ await renderView(footer, o) }
	`
}
