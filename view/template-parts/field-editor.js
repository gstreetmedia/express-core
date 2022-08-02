/**
 * @param {ViewObject} o
 * @returns {string}
 */
module.exports = (o) => {
	let fields = o.model.fields;
	let groups = ["adminIndex", "adminRead", "adminCreate", "adminUpdate", "publicIndex", "publicRead", "publicCreate", "publicUpdate"];
	return `
<form id="fieldForm" action="/admin/fields/${o.model.tableName}" method="post">
	<div class="container-fluid px-2">
		<div class="row gx-2">
			${groups.map((group) => {
				return `
				<div class="col-3 mt-2">
					<div class="row g-2" data-field-group="${group}">
						<div class="col-md-12">
							<h4>${group}</h4>
						</div>
					</div>
					<div class="property-group" data-bindid="group">
						${fields[group].map(
						(item) => {
							return `
						<div class="row gx-2 mb-1 property-item " data-property-name="${item.property}" data-bindid="property" >
							<div class="col">
								<div class="card">
									<div class="card-body p-0">
										<div class="d-inline-flex justify-content-between w-100">
											
											<div class="p-2">
												
												${item.property}
											</div>
											<div class="form-check form-switch pt-2 pe-2 pb-1">
												<input class="form-check-input"
												type="checkbox" 
												name="${group}[${item.property}]" 
												value="1" 
												${item.visible ?"checked" : ""} >
												<i class="fa fa-fw fa-reorder text-muted"></i>
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
