const DataTableRelation = require("../elements/DataTableRelation");
const RecordItemView = require("../elements/RecordItemView");
const _ = require("lodash");
const inflector = require("../../helper/inflector");
const getView = require("../../helper/view/get-view");
const formHelper = require("./form/form-helper");


class ModelForm {

	/**
	 * @param {ViewObject} o
	 */
	constructor(o) {
		this.o = o;
	}

	/**
	 * @param {ViewObject} o
	 */
	async doView(o) {
		let model = o.model;
		let data = o.data;

		let properties;
		if (o.action === "edit") {
			properties = _.filter(model.fields.adminUpdate, {visible: true});
		} else {
			properties = _.filter(model.fields.adminCreate, {visible: true});
		}
		properties = _.map(properties, "property");
		let values = [];
		for (let i = 0; i < properties.length; i++) {
			let key = properties[i];
			if (!key) {
				continue;
			}
			values.push(await this.renderProperty(model, key, data, o.action));
		}
		return `
		${values.join('')}`
	}

	async renderProperty(model, key, data, action){
		let view = await getView("elements/" + inflector.camelize(model.tableName, true) + "FieldEdit");
		if(view && typeof view[key] === "function") {
			return view[key](model, key, data);
		}

		let value;
		if (action === "edit") {
			value = data[key];
		} else {
			value = model.properties[key].default || model.properties[key].allowNull ? null : "";
		}

		let element = formHelper(model, key, value, typeof data === "object" ? data.lookup : null);
		let required = false;
		if (_.indexOf(model.schema.required, key) !== -1) {
			required = true;
		}

		return `
				<div class="form-group row clearfix mb-2">
					<label class="label col-md-3">
					${inflector.camelize(inflector.underscore(key))}${required ? "*" : ""}
				</label>
				<div class="col-md-9">
					${element}
				</div>
				</div>`
	}

	async template(o) {
		return `
		<form class='form'
		  data-endpoint="${global.apiRoot}/${o.model.schema.route}${o.action === "edit" ? '/' + o.data[o.model.primaryKey] : ''}"
		method="${o.action === "edit" ? "put" : "post"}">
		${ await this.doView(o) }
		</form>`
	}

	async render(o) {
		o = o || this.o;
		if (!o) {
			return '<h1>Please pass in or construct with a ViewObject';
		}
		return await this.template(o);
	}
}

module.exports = ModelForm;
