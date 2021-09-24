const inflector = require("../../helper/inflector");
const inflectFromTable = require("../../helper/inflect-from-table");
const getView = require("../../helper/view/get-view");
const renderView = require("../../helper/view/render-view");

class ViewObject {

	constructor(o) {
		this.obj = o;
	}

	/**
	 * The Source Object
	 * @returns {*}
	 */
	get obj() {
		return this._obj;
	}

	/**
	 * @param {object} value
	 */
	set obj(value) {
		this._obj = value;
		if (this._obj.query) {
			delete this._obj.query.select;
			delete this._obj.query.join;
		}
	}
	/**
	 * This display title for the current model
	 * @returns {string}
	 */
	get title() {
		if (this.obj.title) {
			return this.obj.title;
		}
		return inflector.titleize(inflector.dasherize(this.model.tableName));
	}
	/**
	 * @returns {string}
	 */
	get name() {
		if (this.obj.name) {
			return this.obj.name;
		}
		return inflector.titleize(inflector.dasherize(this.model.tableName));
	}
	get slug() {
		if (this.obj.slug) {
			return this.obj.slug;
		}
		return inflector.dasherize(inflector.singularize(this.model.tableName));
	}
	/**
	 * @returns {ModelBase}
	 */
	get model() {
		return this.obj.model || {
			tableName : "_",
			schema : {
				title : "Unknowm"
			},
			title : "Unknown"
		};
	}

	/**
	 * @returns {ModelBase}
	 */
	get targetModel() {
		return this.obj.targetModel;
	}
	/**
	 * @returns {object}
	 */
	get data() {
		return this.obj.data;
	}
	/**
	 * @returns {object}
	 */
	get schemas() {
		return this.obj.schemas;
	}
	/**
	 * @returns {string}
	 */
	get action() {
		return this.obj.action;
	}
	/**
	 * @returns {string|int}
	 */
	get primaryKey() {
		return this.model.primaryKey;
	}
	/**
	 * @returns {JsonSchema}
	 */
	get schema() {
		return this.model.schema;
	}
	/**
	 * @returns {object}
	 */
	get fields() {
		return this.model.fields;
	}
	/**
	 * @returns {object}
	 */
	get query() {
		return this.obj.query;
	}

	/**
	 * @returns {Request}
	 */
	get req() {
		return this.obj.req;
	}

	/**
	 * @param {Request} value
	 */
	set req(value) {
		this.obj.req = value;
	}
	/**
	 * @returns {string}
	 */
	get route() {
		if (this.schema.route) {
			return this.schema.route;
		}
		return inflectFromTable.route(this.model.tableName);
	}

	get styles() {
		this.obj.styles = this.obj.styles || [];
		return this.obj.styles;
	}

	get scripts() {
		this.obj.scripts = this.obj.scripts || [];
		return this.obj.scripts;
	}

	get header() {
		this.obj.header = this.obj.header || [];
		return this.obj.header;
	}

	set addHeader(value) {
		this.header.push(value);
	}

	get footer() {
		this.obj.footer = this.obj.footer || [];
		return this.obj.header;
	}

	set addFooter(value) {
		this.footer.push(value);
	}

	/**
	 * @param {string|array}viewName
	 * @returns {Promise<*>}
	 */
	async getView(viewName) {
		return await getView(viewName);
	}

	/**
	 * @param {Promise|Function} view
	 * @param {ViewObject} o
	 * @returns {Promise<*>}
	 */
	async renderView(view, o) {
		return await renderView(view, o);
	}

	toString() {
		return JSON.stringify(this.o);
	}
}

module.exports = ViewObject;
