/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
	if (o.req.xhr) {
		return '';
	}
	let model = o.model || {tableName : null};
	let nav = await o.getView("admin-navigation");

return `
<!DOCTYPE html>
<html>
<head>
	<title>${ global.appTitle || "Express Core"}</title>
	<!-- /* Viewport tag for sensible mobile support */ -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
	<link type="text/css" rel="stylesheet"
		  href="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.1.1/css/bootstrap.min.css" />
	<link type="text/css" rel="stylesheet" href="/css/styles.css" />
	<link type="text/css" rel="stylesheet" href="/css/font-awesome.css" />
	<link type="text/css" rel="stylesheet" href="/css/admin.css" />
	<link type="text/css" rel="stylesheet"
		  href="//cdnjs.cloudflare.com/ajax/libs/jsoneditor/5.26.0/jsoneditor.min.css" />
	<link type="text/css" rel="stylesheet"
		  href="//cdnjs.cloudflare.com/ajax/libs/jquery-jsonview/1.2.3/jquery.jsonview.css" />

	<link rel="stylesheet" type="text/css"
		  href="//fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"/>
	<link href="//cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
	<link type="text/css" rel="stylesheet" href="/css/jquery.fancybox.css" />
	<link type="text/css" rel="stylesheet" href="/css/codemirror.css" />
	<link type="text/css" rel="stylesheet" href="/css/theme/dracula.css" />
	<link href="//cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.css" rel="stylesheet" />
    <link rel="stylesheet" href="/css/prettydropdowns.css" />
    ${ o.styles.map((item)=>{
    	return `<link href="${item}" rel="stylesheet" type="text/css" />`;
	}).join("\n")};
</head>
<body>
<nav class="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow ps-1 pe-1">
	<a class="navbar-brand col-sm-3 col-md-2 me-0" href="#">Admin</a>
	<input id="modelSearch" class="form-control form-control-dark w-100 autocomplete" type="text" placeholder="Search ${ model.schema.title }" aria-label="Search">
	<ul class="navbar-nav px-3">
		<li class="nav-item text-nowrap">
			<form
					action="${ global.apiRoot }/user/logout"
					method="get"
					data-success="/"
			>
				<button type="submit" class="btn btn-link">Sign out</button>
			</form>
		</li>
	</ul>
</nav>
<div class="container-fluid">
	<div class="row">
		${ await nav(o) }
		<main role="main" class="col-md-10 ml-sm-auto col-lg-10 p-0">
`
}
