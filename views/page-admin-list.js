let DataTable = require("./elements/DataTable");
let inflector = require("../helper/inflector");
/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
	let header = await o.getView("header-admin");
	let footer = await o.getView("footer-admin");
	let dataTable = new DataTable(o);
	let pagination = await o.getView("template-parts/pagination");
	return `
${ await o.renderView(header, o) }    
<div class="navbar">
	<h5 class="title">${ o.model.schema.title } Index</h5>
	<div>
		<span class="fields-link">
		<a href="/admin/fields/${ o.model.tableName }" 
		data-table-name="${ o.model.tableName }"
		data-name="${ o.name }" 
		class="btn btn-secondary btn-sm">${ o.model.schema.title } Fields</a>
		</span>
		<span class="create-link">
		<a href="/admin/${ o.model.tableName }/create" 
		data-table-name="${ o.model.tableName }"
		data-name="${ o.name }" 
		class="btn btn-secondary btn-sm">New ${ inflector.singularize(o.model.schema.title) }</a>
		</span>
	</div>
</div>
${ dataTable.render(o) } 
${ await o.renderView(pagination, o) } 
${ await o.renderView(footer, o) }  
`
}
