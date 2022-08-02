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
<div class="mb-4 position-relative">
	<div id="table_${ this.instance }" class="container-fluid gridded gridded-inline model-relation " style="min-height: 250px;">
		<div class="inner" style="min-width:100%;position: absolute">
			<div class="row header m-0">
				${this.header(this.keys)}
			
			</div>
			${this.rows(this.keys)}
		</div>
	</div>
	<style>
		#table_${this.instance} .col.value {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		#table_${this.instance} .col.action .value {
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		    position: absolute;
		    padding: 0 0 0 30px;
		}
		
	</style>
</div>`
	}
}

module.exports = DataTableRelation;
