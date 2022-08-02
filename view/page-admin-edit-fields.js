/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {

	let header = await o.getView("header-admin");
	let footer = await o.getView("footer-admin");
	let fieldEditor = await o.getView("template-parts/field-edit-fields");
	return `
	${ await o.renderView(header, o) }
	<div class="navbar">
		<h5 class="title">${ o.targetModel.schema.title } Fields</h5>
	</div>
	${ fieldEditor(o) } 
	${ await o.renderView(footer, o) }
	`
}
