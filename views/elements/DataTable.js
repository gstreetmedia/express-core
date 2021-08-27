const inflector = require("../../helper/inflector");
const valueFormat = require("../../helper/view/value-format");
const _ = require("lodash");
const ViewObject = require("../../model/objects/ViewObject");

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
				`<div class="col-1 border-right border-top p-1">
					<a href="/admin/${context.o.model.tableName}?query=${link}" class="order d-block float-right">
						<span class="material-icons">
							${icon}
						</span>
					</a>
					<span class="name d-block float-left">${property}</span>
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
	columns(row, keys) {
		let items = [];
		keys.forEach(
			(key) => {
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
					`<div class="col-1 p-1 border-right">
					${valueFormat(this.o.model, key, value, name)}
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
			(row) => {
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
					data-bindid="view"
				>`
				html += context.columns(row, keys);
				html += context.actions(primaryKeyValue, row);
				html += "</div>";
				count++;

			}
		)
		return html;
	}

	actions(primaryKeyValue, row) {
		return `
		<div class="col-1 p-1 actions td-actions text-right">
			<button class="btn btn-link edit" data-bindid="edit" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">
				<i class="material-icons">edit</i>
			</button>
			<button class="btn btn-link delete" data-bindid="delete" data-table="${this.o.model.tableName}" data-id="${primaryKeyValue}">
				<i class="material-icons">close</i>
			</button>
		</div>
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

	<div id="table_${this.instance}" class="container-fluid gridded">
		<div style="width:${this.keys.length <= 8 ? "100%;margin-right:17px;" : (this.keys.length + 1) * 150 + "px"};min-width:100%;position: absolute;">
			<div class="row header m-0">
				${this.header(this.keys)}
				<div class="col-1 border-top text-right p-1">Actions</div>
			</div>
			${this.rows(this.keys)}
		</div>
	</div>

	<style>
		#table_${this.instance} .col-1 {
		min-width: ${this.keys.length <= 8 ? 100 / (this.keys.length + 1) + "%" : '150px'} !important;
		max-width: ${this.keys.length <= 8 ? 100 / (this.keys.length + 1) + "%" : '150px'} !important;
		float: left;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
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
