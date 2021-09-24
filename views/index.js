const getView = require("../helper/view/get-view");
const renderView = require("../helper/view/render-view");

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
                    <img class="mb-0" width="100%" height="72" src="/img/express-core-logo.svg">
                </div>
            </div>
        </div>
    </div>
</div>
${ await o.renderView(footer, o) }    
`
}
