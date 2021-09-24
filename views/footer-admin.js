/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
	if (o.req.xhr) {
		return '';
	}

	return `
    </main>
    </div>
    </div>
    <div id='view-modal' class="modal modal-full-screen" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header flex">
                    <div>
                        <h5 class="modal-title">Modal title </h5>
                    </div>

                    <div class="mt-1 me-1">
                        <button class="btn btn-primary" data-bindid="edit">Edit</button>
                        <button type="button" class="btn btn-dark"
                        data-bs-target="#view-modal"  
                        data-bs-dismiss="modal" 
                        aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                </div>
                <div class="modal-body">
                </div>
            </div>
        </div>
    </div>
    <div id='edit-modal' class="modal modal-full-screen" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <div>
                        <h5 class="modal-title p-2">Modal title</h5>
                    </div>
                    <div class="mt-1 me-1">
                        <button class="btn btn-primary" data-bindid="save">Save</button>
                        <button type="button" class="btn btn-dark"
                        data-bs-target="#edit-modal" 
                        data-bs-dismiss="modal" 
                        aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                </div>
                <div class="modal-body">

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary">Save changes</button>
                </div>
            </div>
        </div>
    </div>

    <script>
		var app = app || {};
		app.action = '${o.action}';
		app.modelTitle = '${o.model && o.model.schema ? o.model.schema.title : ''}';
		app.route = '${o.model && o.model.schema  ? o.model.schema.route : ''}'
		app.tableName = '${o.model ? o.model.tableName : ''}'
		app.schema = ${o.model && o.model.schema  ? JSON.stringify(o.model.schema) : '{}'};
		app.apiRoot = '${global.apiRoot}';
    </script>

    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.1/underscore-min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/popper.js/2.10.1/umd/popper.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.1.1/js/bootstrap.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jsoneditor/5.26.0/jsoneditor.min.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery-jsonview/1.2.3/jquery.jsonview.js"></script>
    <script src="//unpkg.com/sweetalert/dist/sweetalert.min.js"></script>
    <script src="//cdn.jsdelivr.net/npm/@shopify/draggable@1.0.0-beta.8/lib/draggable.bundle.js"></script>
	<script src="//cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

    <script src="/js/quill-delta.js"></script>
    <script src="/js/jquery.serialize.json.js"></script>
    <script src="/js/jquery.autocomplete.js"></script>
    <script src="/js/jquery.fancybox.js"></script>
    <script src="/js/codemirror.js"></script>
    <script src="/js/javascript.js"></script>
    <script src="/js/codemirror.autoformat.js"></script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.js"></script>
    <!-- Include Choices JavaScript -->
    <script src="/js/jquery.prettydropdowns.js"></script>
    
    ${ o.scripts.map((item)=>{
		return `<script src="${item}"></script>`;
	}).join("\n")};
    
    <script src="/js/main.js"></script>
    
    </body>
    </html>
`
}
