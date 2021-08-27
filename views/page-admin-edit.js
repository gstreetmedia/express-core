const inflector = require("../../core/helper/inflector");
/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	let header = await o.getView("header-admin");
	let footer = await o.getView("footer-admin");
	const ModelForm = await o.getView(["elements/"+ inflector.camelize(o.model.tableName, true) + "ModelForm", "elements/ModelForm"]);
	let modelForm = new ModelForm(o.model);

	return `
	${ await o.renderView(header, o) }   
	<div class="p-4">
	${ await modelForm.render(o) } 
	</div>
	${ await o.renderView(footer, o) }  
	`
}
