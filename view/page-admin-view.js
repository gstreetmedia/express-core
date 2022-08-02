/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	const inflector = require("../../core/helper/inflector");
	const header = await o.getView("header-admin");
	const footer = await o.getView("footer-admin");
	const ModelView = await o.getView(["elements/"+ inflector.camelize(o.model.tableName, true) + "ModelView", "elements/ModelView"]);
	let modelView = new ModelView(o.model);
	return `
${ await o.renderView(header, o) }  
<div class="p-4">
	<div>
		<div class="row">
			${(!o.req || !o.req.xhr) ? `
			<div class="float-right">
				${o.action === 'edit' ?
				`<a href="/admin/${o.model.tableName}/${o.model.primaryKey}/view">View</a>`
				:
				`<a href="/admin/${o.model.tableName}/${o.model.primaryKey}/edit">Edit</a>`
			}
			</div>
			<h4 class="card-title m-0  pb-4">View ${o.title}</h4>
			` : ``}
		</div>
			${ await modelView.render(o) }
	</div>
</div>
${ await o.renderView(footer, o) }  
`
}
