class RolePermissionsFieldEdit {
	static async route(model, key, data, o) {
		console.log("Render Listing Media");
		let endPointLookup = require("../../helper/view/endpoints-lookup");
		let routes = endPointLookup(o.req.app);
		let selected = data[key] || [];
		let count = 0;
		return `
		<div class="row mb-2">
			<label class="label col-md-3 mb-2">${ key }</label>
	        <div class="col-md-9">
	            <div class="row mt-2">
	                ${ routes.map(
						(route) => {
							count++;
						return `
						<div class="form-check form-switch col-3">
						  <input class="form-check-input" 
						  type="checkbox"
						  name="route[${count}]"
						  value="${route.path}"
						  data-type="array"
						  ${ selected.includes(route.path) ? " checked " : ""}
						  />
						  <label class="form-check-label" for="route[${count}]">
						    ${route.path}
						  </label>
						</div>`
						}
					).join("")}
	            </div>
	        </div>
		</div>`

	}
}

module.exports = RolePermissionsFieldEdit;
