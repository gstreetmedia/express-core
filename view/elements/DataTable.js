const inflector = require("../../helper/inflector");
const valueFormat = require("../elements/form/value-format");
const _ = require("lodash");
const ViewObject = require("../../object/ViewObject");

class DataTable {

	constructor(o) {
		this.o = o;
	}

	/**
	 * @returns {ViewObject}
	 */
	get o() {
		return this._o;
	}

	/**
	 * @param {ViewObject} value
	 */
	set o(value) {
		this._o = value;
	}

	/**
	 * @param {array} keys
	 * @returns {string}
	 */
	header(keys) {
		let items = [];
		let context = this;
		keys.forEach(function (property) {
			if (!property) {
				return;
			}
			let q = _.clone(context.o.query);
			let iconName = 'arrow_drop_down';
			let sort = context.sort;
			if (sort[property]) {
				q.sort = property + " " + (sort[property] === "ASC" ? "DESC" : "ASC");
				iconName = sort[property] === "ASC" ? "arrow_drop_up" : "arrow_drop_down";
			} else {
				q.sort = property + " DESC";
			}

			let link = JSON.stringify(q).split('"').join('&quot;')
			let icon = `<span class="material-icons-outlined">${iconName}</span>`;

			items.push(
				`<div class="col border-end border-top p-1 position-relative">
					<span class="name d-inline-block float-start">${property}</span>
					<a href="/admin/${context.o.model.tableName}?query=${link}" class="order d-block position-absolute top-0 end-0">
						<span class="material-icons">
							${icon}
						</span>
					</a>
				 </div>`
			)
		});
		return items.join("");
	}

	/**
	 * @param {array} row
	 * @param {array} keys
	 * @returns {string}
	 */
	columns(row, keys, primaryKeyValue) {
		let items = [];
		let context = this;
		keys.forEach(
			(key, index) => {
				if (!key) {
					return;
				}
				let name;
				//console.log(row.foreignKeys);
				if (row.foreignKeys && row.foreignKeys[key] && row.foreignKeys[key].name) {
					name = row.foreignKeys[key].name
				}

				let value = key.indexOf(".") !== -1 ? _.get(row, key) : row[key];

				items.push(
					`<div class="col p-1 border-end position-relative ${index === 0 ? 'action' : 'value' }">
						
						<span class="value">${valueFormat(this.o.model, key, value, name)}</span>
						${index === 0 ? context.actions(primaryKeyValue, row) : ''}
					</div>`
				);
			});
		return items.join("");
	}

	/**
	 * @param {array} keys
	 * @returns {string}
	 */
	rows(keys) {
		let html = "";
		let count = 0;
		let type = "";
		let context = this;
		let primaryKey = context.o.model.primaryKey;
		this.o.data.forEach(
			(row, index) => {
				let primaryKeyValue;
				if (_.isArray(primaryKey)) {
					primaryKeyValue = [];
					primaryKey.forEach(
						(k) => {
							primaryKeyValue.push(row[k]);
						}
					)
					primaryKeyValue = primaryKeyValue.join("|");
				} else {
					primaryKeyValue = row[primaryKey]
				}

				html += `<div class="row m-0 border-top row-striped" 
					data-id="${primaryKeyValue}" 
					data-table="${this.o.model.tableName}"
					data-route="${this.o.model.schema.route}"
					data-bindid="view"
					data-primary-key="${primaryKey}"
				>`
				html += context.columns(row, keys, primaryKeyValue);
				html += "</div>";
				count++;

			}
		)
		return html;
	}

	actions(primaryKeyValue) {

		return `
		
		<div class="actions dropdown d-block float-left position-absolute">
		  <button class="btn btn-link dropdown-toggle" type="button" id="dropdownMenuButton-${primaryKeyValue}" data-bs-toggle="dropdown" aria-expanded="false">
		    <span class="sr-only">Actions</span>
		  </button>
		  <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="dropdownMenuButton-${primaryKeyValue}">
		  	<li><a class="button dropdown-item" href="/view" data-bindid="view" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">View</a></li>
		    <li><a class="button dropdown-item" href="/edit" data-bindid="edit" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">Edit</a></li>
		    <li><a class="button dropdown-item" href="/delete" data-bindid="delete" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">Delete</a></li>
		  </ul>
		</div>
		<!--
		<div class="col border-end border-top p-1 actions td-actions">
			<button class="btn btn-sm btn-link edit" data-bindid="edit" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">
				<i class="material-icons">edit</i>
			</button>
			<button class="btn btn-sm btn-link delete" data-bindid="delete" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">
				<i class="material-icons">close</i>
			</button>
		</div>
		-->
		
		`
	}

	get sort() {
		let sortList = typeof this.o.query.sort == "string" ? this.o.query.sort.split(",") : [];
		let sort = {};
		sortList.forEach(
			(item) => {
				let parts = item.split(" ");
				sort[parts[0]] = parts[1];
			}
		)
		return sort;
	}

	get instance() {
		if (this._instance) {
			return this._instance;
		}
		this._instance = new Date().getTime();
		return this._instance;
	}

	get keys() {
		if (this._keys) {
			return this._keys;
		}
		let keys = this.o.model.fields.adminIndex || Object.keys(data[0]);
		this._keys = _.map(_.filter(keys, {visible: true}), "property");
		return this._keys;
	}

	template() {
		if (this.o.data.length > 0) {

			return `

	<div id="table_${this.instance}" class="container-fluid gridded model-index">
		<div style="width:${this.keys.length <= 8 ? "100%;margin-right:17px;" : (this.keys.length + 1) * 150 + "px"};min-width:100%;position: absolute;">
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
	`
		} else {
			return `
	<div class="row p-4">
		<div class="col">
			<strong>No ${inflector.pluralize(this.o.model.schema.title)} Yet</strong><br/>
			<a href="/admin/${this.o.model.tableName}/create" class="d-none">Create your first</a>
		</div>
	</div>`
		}
	}

	render(o) {
		if (o) {
			this.o = o;
		}
		if (!this.o) {
			return '<h1>Error. Please construct with a ViewObject'
		}
		return this.template()
	}
}

module.exports = DataTable;