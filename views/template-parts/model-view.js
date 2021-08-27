/**
 * @param {ModelBase} model
 * @param {object} data
 * @returns {string}
 */
module.exports = (model, data) => {
	let _ = require("lodash");
	let properties = _.filter(model.fields.adminRead, {visible:true});
	let inflector = require("../../helper/inflector");
	properties = _.map(properties, "property");
	let recordItemView = require("./record-item-view");
	let dataTableRelation = require("./data-table-relation");

	/**
	 * @param {ModelBase} model
	 * @param {object} data
	 * @returns {string}
	 */
	let doRelations = (model, data) => {
		let html = '';
		let relations = Object.keys(model.relations);
		relations.forEach(
			(key) => {
				if (data[key]) {
					let relationModel = model.loadModel(model.relations[key].modelClass);
					let relationData = data[key];
					html += `<h5>${inflector.titleize(key)}</h5>`
					if (_.isArray(relationData)) {
						html += dataTableRelation(relationModel, relationData);
					} else {
						html += doView(relationModel, relationData);
					}
				}
			}
		);
		return html;
	}

	/**
	 * @param {ModelBase} model
	 * @param {object} data
	 * @returns {string}
	 */
	let doView = (model, data) => {
		let properties = _.filter(model.fields.adminRead, {visible:true});
		properties = _.map(properties, "property");
		return `
		<div class="row">
			${
			properties.map(
				(key) => {
					if (key) {
						return recordItemView(model, key, data[key]);
					}
				}).join('')}
		</div>`
	}

	return `
		${ doView(model, data) }
		${ doRelations(model, data) }
`
}
