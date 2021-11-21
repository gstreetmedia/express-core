const DataTableRelation = require("../elements/DataTableRelation");
const RecordItemView = require("../elements/RecordItemView");
const _ = require("lodash");
const inflector = require("../../helper/inflector");
const getView = require("../../helper/view/get-view");

class ModelView {

	constructor(model) {
		this.model = model;
	}

	get recordItemView() {
		if(!this._recordItemView) {
			this._recordItemView = new RecordItemView(this.model);
		}
		return this._recordItemView;
	}

	async doRelations(model, data) {
		let groups = {};
		let relations = Object.keys(await model.getRelations());
		for (const key of relations) {
			if (data[key]) {
				let html = '';
				let ModelName = model.relations[key].model || model.relations[key].modelClass;
				let RelationModel = model.loadModel(ModelName);
				let relationModel = new RelationModel(model.req);
				await relationModel.init();
				let relationData = data[key];

				//html += `<h5>${inflector.titleize(key)}</h5>`
				if (_.isArray(relationData)) {
					let dataTableRelation = new DataTableRelation({model:relationModel,data:relationData})
					html += await dataTableRelation.render();
				} else {
					html += await this.doView(relationModel, relationData);
				}
				groups[key] = {
					html : html,
					model : relationModel,
					data : relationData
				}
			}
		}

		let keys = Object.keys(groups);
		let count = -1;
		let tabs = `
			<ul class="nav nav-tabs mt-4" id="${model.tableName}-relations-tabs" role="tablist">
			${keys.map((key)=>{
			let tab = groups[key];
			count++;
			return `
				<li class="nav-item me-1" role="presentation">
    				<button class="nav-link${ count === 0 ? " active" : ""}" id="${key}-tab" 
    				 data-target="#${key}-relation" 
    				 type="button" 
    				 role="tab" 
    				 data-bindid="tab"
    				 aria-controls="${key}-tab" 
    				 aria-selected="true">${ inflector.titleize(key) }</button>
  				</li>
				`
		}).join("")}
			</ul>
		`;
		count = -1;
		let tabContent = `
			<div class="tab-content mt-4" id="${model.tableName}-relations-tabs-content">
			${keys.map((key)=>{
			let tab = groups[key];
			count++;
			return `
			<div class="tab-pane${ count === 0 ? ' show active' : ""}" id="${key}-relation" role="tabpanel" aria-labelledby="${key}-tab">
			${tab.html}
			</div>
			`}).join("")}
			</div>
		`;

		return tabs + tabContent;
	}

	async doView(model, data) {

		let properties = _.filter(model.fields.adminRead, {visible:true});
		properties = _.map(properties, "property");
		let values = [];
		for (let i = 0; i < properties.length; i++) {
			let key = properties[i];
			if (!key) {
				continue;
			}
			let rootKey  = key.split(".")[0];
			if (data.hasOwnProperty(rootKey)) {
				values.push(await this.renderProperty(model, key, data));
			} else {
				//console.log(key + " not in data");
			}
		}
		return `
		<div class="row">
			${values.join('')}
		</div>`
	}

	async renderProperty(model, key, data){
		let view = await getView("elements/" + inflector.camelize(model.tableName, true) + "FieldView")
		//TODO Need a Renderer per Model
		if(view && typeof view[key] === "function") {
			return view[key](model, key, data);
		}
		return this.recordItemView.render(model, key, data);
	}

	async template(o) {
		return `
		${ await this.doView(o.model, o.data) }
		${ await this.doRelations(o.model, o.data) }
`
	}

	async render(o) {
		return this.template(o);
	}
}

module.exports = ModelView;
