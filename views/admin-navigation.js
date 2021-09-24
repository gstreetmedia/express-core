module.exports = async (o) => {
	let keys = Object.keys(o.schemas);
	keys.sort();
	return `
	<nav class="col-md-2 d-none d-md-block bg-light sidebar">
			<div class="sidebar-sticky">
				<ul class="nav flex-column" id="mainNav">
					<li class="nav-item">
						<a class="nav-link" href="/admin">
							Dashboard <span class="sr-only">(current)</span>
						</a>
					</li>

					${keys.map(
		(key) => {
			let item = o.schemas[key];
			return `
						<li class="nav-item">
							<a id="${ item.tableName }" 
								class="nav-link ${ o.model.tableName === item.tableName ? "active" : "" }"
								href="/admin/${ item.tableName }">
								${ item.title }
							</a>
						</li>`
		}
	).join("")}
				</ul>
			</div>
		</nav>
`
}
