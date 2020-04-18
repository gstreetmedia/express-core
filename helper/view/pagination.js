let _ = require("lodash");

module.exports = (query, data, slug, req) => {
	console.log("pagination");
	let q = _.clone(query);
	let where;
	if (query.where) {
		where = "?where=" + JSON.stringify(q.where).replace('"','&quot;') + "";
	} else {
		where = "?";
	}
	if (req.count && req.limit && req.offset === 0) {
		//return ``;
	}
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
			content += `<li class="page-item ${i * req.limit === req.offset ? "active" : ""}"
                data-bindid="pagination" data-offset="${(i) * req.limit}"
            >
                <a class="page-link"
                   href="/admin/${slug}${where}&offset=${(i) * req.limit}&limit=${req.limit}&sort=${q.sort}"
                   aria-label="Switch to page ${i + 1}">
                    ${i + 1}
                </a>
            </li>`;
		}

		return content;
	}

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
                `<li class="page-item" data-bindid="pagination-beginning" data-offset="0">
                    <a class="page-link" href='/admin/${ slug }${ where }&limit=${ req.limit }&sort=${ q.sort }'
                       aria-label="Previous">
                        <i class="material-icons">first_page</i>
                        <span class="sr-only">First Page</span>
                    </a>
                </li>` : ``
			}
            ${previousPage > 0 ?
                `<li class="page-item" data-bindid="pagination-previous" data-offset="${ previousPage * req.limit }">
                    <a class="page-link"
                       href="/admin/${ slug }${ where }&offset=${ previousPage * req.limit }&limit=${ req.limit }&sort=${ q.sort }"
                       aria-label="Previous 50 results">
                        <i class="material-icons">chevron_left</i>
                        <span class="sr-only">Previous Page</span>
                    </a>
                </li>`
            : `` }

            ${loop()}
            
            ${nextPage !== totalPages ?
                `<li class="pagination-item" data-bindid="pagination-next"
                    data-offset="${ nextPage * req.limit }&sort=${ q.sort }">
                    <a class="page-link"
                       href="/admin/${ slug }${ where }&offset=${ nextPage * req.limit }&limit=${ req.limit }&sort=${ q.sort }"
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