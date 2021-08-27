let _ = require("lodash");

module.exports = (query, data, slug, req) => {

	query = _.clone(query);
	delete query.select;
	delete query.join;
	console.log(query);


	let totalPages = Math.ceil(req.count / req.limit);
	let currentPage = Math.ceil(req.offset / req.limit);
	let maxPages = 20;
	let nextPage = Math.min(currentPage + 1, totalPages);
	let previousPage = Math.max(currentPage - 1, 0);
	let start = Math.max(currentPage - 1, 0);
	let end = Math.min(start + maxPages, totalPages);

	if (end - start < maxPages) {
		start = Math.max(end - maxPages, 0);
	}

	let loop = () => {
		let content = '';
		let i;
		for(i = start; i < end; i++) {
			let q = _.clone(query);
			q.offset = i * query.limit;
			content += `<li class="page-item ${i * req.limit === req.offset ? "active" : ""}"
                data-bindid="pagination"            >
                <a class="page-link"
                   href="/admin/${slug}?query=${ JSON.stringify(q).split('"').join('&quot;')}"
                   aria-label="Switch to page ${i + 1}">
                    ${i + 1}
                </a>
            </li>`;
		}

		return content;
	}

	let q = _.clone(query);
	q.offset = 0;
	let beginningQuery = JSON.stringify(q).split('"').join('&quot;');
	q.offset = previousPage * req.limit;
	let previousPageQuery = JSON.stringify(q).split('"').join('&quot;')
	q.offset = nextPage * req.limit;
	let nextPageQuery = JSON.stringify(q).split('"').join('&quot;')

	return `
	<div class="pagination-container fixed-bottom border-top">

    <div
            data-totalItems="${ req.count }"
            data-totalPages="${ totalPages }"
            data-currentPage="${ currentPage }"
            data-nextPage="${ nextPage }"
            data-previousPage="${ previousPage }"
            data-start="${ start }"
            data-end="${ end }"
            data-skip="${ req.offset }"
            data-limit="${ req.limit }"
    >
        <ul class="pagination bg-light justify-content-center">
            ${start >= 0 ?
                `<li class="page-item" data-bindid="pagination-beginning">
                    <a class="page-link" href='/admin/${slug}?query=${beginningQuery}'
                       aria-label="Previous">
                        <i class="material-icons">first_page</i>
                        <span class="sr-only">First Page</span>
                    </a>
                </li>` : ``
			}
            ${previousPage > 0 ?
                `<li class="page-item" data-bindid="pagination-previous" data-offset="${ previousPage * req.limit }">
                    <a class="page-link"
                       href="/admin/${ slug }?query=${previousPageQuery}"
                       aria-label="Previous 50 results">
                        <i class="material-icons">chevron_left</i>
                        <span class="sr-only">Previous Page</span>
                    </a>
                </li>`
            : `` }

            ${loop()}
            
            ${nextPage !== totalPages ?
                `<li class="pagination-item" data-bindid="pagination-next">
                    <a class="page-link"
                       href="/admin/${ slug }?query=${nextPageQuery}"
                       aria-label="Next">
                        <i class="material-icons">chevron_right</i>
                        <span class="sr-only">Next Page</span>
                    </a>
                </li>` : `` 
			}
        </ul>
    </div>
    ${totalPages > 1 ?
        `<div class="page-counter">
            ${ start } to ${ end } of ${ totalPages } Pages
        </div>` : `` }
	</div>
	<style>
	    .page-counter {
	        position: absolute;
	        top: 10px;
	        left: 5px;
	        z-index: 1;
	    }
	</style>`
};
