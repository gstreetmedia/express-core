const DataTable = require("./DataTable");
const inflector = require("../../helper/inflector");

class DataTableRelation extends DataTable {
	constructor(o) {
		super(o);
	}

	header(keys) {
		let items = [];
		keys.forEach(function (property) {
			if (!property) {
				return;
			}
			items.push(
				`<div class="col border-right border-top p-1">${inflector.classify(inflector.underscore(property))}</div>`
			)
		});
		return items.join("");
	}

	template() {
		return `
<div class="mb-4" style="position: relative">
	<div id="table_${ this.instance }" class="container-fluid gridded gridded-inline model-relation ">
		<div class="inner" style="min-width:100%;position: absolute">
			<div class="row header m-0">
				${this.header(this.keys)}
				<div class="col border-top text-right p-1 actions">Actions</div>
			</div>
			${this.rows(this.keys)}
		</div>
	</div>
	<style>
		#table_${ this.instance } .col {
		/*
			min-width: ${ this.keys.length <= 8 ? 100 / (this.keys.length + 1) + "%" : '150px'} !important;
			max-width: ${ this.keys.length <= 8 ? 100 / (this.keys.length + 1) + "%" : '150px'} !important;
			
		 */
			float: left;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
	</style>
</div>`
	}
}

module.exports = DataTableRelation;
