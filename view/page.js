/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	const header = await o.getView("header");
	const footer = await o.getView("footer");
	return `
${ await o.renderView(header, o) }    
<div class="container">
	<div class="row">
		<h1>Welcome</h1>
	</div>
</div>
${ await o.renderView(footer, o) }    
`
}
