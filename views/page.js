const getView = require("../helper/view/get-view");
const renderView = require("../helper/view/render-view");

/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	const header = await getView("header");
	const footer = await getView("footer");
	return `
${ await renderView(header, o) }    
<div class="container">
	<div class="row">
		<h1>Welcome</h1>
	</div>
</div>
${ await renderView(footer, o) }    
`
}
