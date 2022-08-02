/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {

	let header = await o.getView("header-admin");
	let footer = await o.getView("footer-admin");
	let fieldEditor = await o.getView("template-parts/field-editor");
	return `
	${ await o.renderView(header, o) }
	<div class="navbar">
		<h5 class="title">${ o.name } Fields</h5>
	</div>
	${ fieldEditor(o) } 
	${ await o.renderView(footer, o) }
	`
}
