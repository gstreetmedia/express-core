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
<div class="container login-view">
    <div class="row">
        <div class="col-lg-4 col-md-8 col-sm-12 ml-auto mr-auto">
            <div class="card">
                <div class="card-body">
                    <img class="mb-0" width="100%" height="72" src="/img/express-core-logo.svg">
                </div>
            </div>
        </div>
    </div>
</div>
${ await renderView(footer, o) }    
`
}
