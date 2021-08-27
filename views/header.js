/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (data) => {
return `
<!DOCTYPE html>
<html lang="${ data.lang || "en" }">
<head>
	<title>Membio:)</title>
	<!-- Viewport tag for sensible mobile support -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
	<link type="text/css" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.1.3/css/bootstrap.css">
	<link type="text/css" rel="stylesheet" href="/css/main.css">
	<link type="text/css" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/5.26.0/jsoneditor.min.css">
	<link type="text/css" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-jsonview/1.2.3/jquery.jsonview.css">
	<link rel="stylesheet" type="text/css"
		  href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"/>
</head>
<body>`
}
