/**
 * @returns {string}
 */
module.exports = (o) => {

	let action = o.action;
	let model = o.model;
	let data = o.data;
	let slug = o.slug;
	let _ = require("lodash");
	let properties;
	if (action === "edit") {
		properties = _.filter(model.fields.adminUpdate, {visible: true});
	} else {
		properties = _.filter(model.fields.adminCreate, {visible: true});
	}
	properties = _.map(properties, "property");
	let formHelper = require("../elements/form");
	let inflector = require("../../helper/inflector");

	return `
	<form class='form'
		  data-endpoint="${global.apiRoot}/${slug}${action === "edit" ? '/' + data[model.primaryKey] : ''}"
		method="${action === "edit" ? "put" : "post"}"
	>
		${properties.map(
		function (key) {
			let value;
			if (action === "edit") {
				value = data[key];
			} else {
				value = "";
			}
			switch (key) {
				case model.primaryKey :
				case "createdAt" :
				case "updatedAt" :
					return;
			}

			let element = formHelper(model, key, value, typeof data === "object" ? data.lookup : null);

			return `
				<div class="form-group row clearfix">
				<label class="label col-md-3">
					${inflector.camelize(inflector.underscore(key))}
				</label>
				<div class="col-md-9">
					${element}
				</div>
				</div>`
		}
	).join("")}
	</form>
</div>`

}
