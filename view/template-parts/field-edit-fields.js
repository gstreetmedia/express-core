/**
 * @param {ViewObject} o
 * @returns {string}
 */
module.exports = (o) => {
	let fields = o.data;
	let groups = ["adminIndex", "adminRead", "adminCreate", "adminUpdate", "publicIndex", "publicRead", "publicCreate", "publicUpdate"];
	let action = o.action;
	let model = o.model;
	let data = o.data;
	let slug = o.slug;
	let _ = require("lodash");
	let properties;
	properties = _.filter(model.fields.adminUpdate, {visible: true});
	console.log(properties);
	properties = _.map(properties, "property");

	let formHelper = require("../elements/form/form-helper");
	let inflector = require("../../helper/inflector");
	return `
<form id="fieldForm" data-endpoint="${global.apiRoot}/${o.model.schema.route}${action === "edit" ? '/' + data[model.primaryKey] : ''}"
		method="${action === "edit" ? "put" : "post"}">
	<div class="container-fluid mb-4">
		${properties.map(
		function (key) {
			if (groups.includes(key)) {
				return;
			}
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
	</div>	
	<div class="container-fluid">
		<div class="row">
			${groups.map((group) => {
				return `
				<div class="col-md-3 mt-2">
				<div class="row" data-field-group="${group}">
					<div class="col-md-12">
						<h4>${group}</h4>
					</div>
				</div>
				<div class="property-group" data-bindid="group">
					${fields[group].map(
					(item) => {
						return `
					<div class="row mb-1 property-item ml-0 me-0" data-property-name="${item.property}" data-bindid="property" >
						<div class="col-lg-12 p-0">
							<div class="card">
								<div class="card-body p-0">
									<div class="d-inline-flex justify-content-between w-100">
										<div class="p-2">
											${item.property}
										</div>
										<div class="switch-group pt-1 pr-2 pb-1">
											<label class="switch">
												<input type="checkbox" name="${group}[${item.property}]" value="1" ${item.visible ? "checked" : ""} >
												<span class="switch-slide round"></span>
											</label>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					`
					}).join('')}
				
				</div>
			</div>
			`}).join("")}
		</div>
	</div>
	
</form>`
}
