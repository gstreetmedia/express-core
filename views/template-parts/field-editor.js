/**
 * @param {ViewObject} o
 * @returns {string}
 */
module.exports = (o) => {
	let fields = o.model.fields;
	let groups = ["adminIndex", "adminRead", "adminCreate", "adminUpdate", "publicIndex", "publicRead", "publicCreate", "publicUpdate"];
	return `
<form id="fieldForm" action="/admin/fields/${o.model.tableName}" method="post">
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
					<div class="row mb-1 property-item ml-0 mr-0" data-property-name="${item.property}" data-bindid="property" >
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
</form>
		`
}
