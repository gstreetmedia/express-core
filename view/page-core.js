/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async(o) => {
	const header = await o.getView("header");
	const footer = await o.getView("footer");
	return `
${ await o.renderView(header, o) }    
<div class="container login-view">
    <div class="row">
        <div class="col-4 mx-auto">
            <div class="card">
            	<div class="card-body">
            		<h1>Core View Test</h1>
				</div>
            </div>
        </div>
    </div>
</div>
${ await o.renderView(footer, o) }    
`
}
