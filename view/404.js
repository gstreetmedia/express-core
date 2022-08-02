/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
	const header = await o.getView("header");
	const footer = await o.getView("footer");
	return `
${await o.renderView(header, o)}    
<div class="login-view wrapper-centered">
    <div class="card card-floating" style="max-width: 480px">
      <div class="card-body text-center">
         <img class="mb-3" width="100%" height="72" src="/img/logo.svg">
          <div class="rounded-pill bg-primary text-white p-1"><h1 class="m-1 p-0 h3">Sorry. We could not find what you were looking for.</h1></div>
      	     <div class="mt-4">
                   &copy;${new Date().getFullYear()} Powered by ExpressCore</a>.
             </div>
          </div>
      </div>
</div>
${await o.renderView(footer, o)}    
`
}

