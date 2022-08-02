/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
return `
<!DOCTYPE html>
<html lang="${ o.lang || "en" }">
<head>
	<title>Membio:)</title>
	<!-- Viewport tag for sensible mobile support -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
	<link type="text/css" rel="stylesheet"
		  href="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/5.1.1/css/bootstrap.min.css" />
	<link type="text/css" rel="stylesheet" href="/css/main.css" />
	<link type="text/css" rel="stylesheet" href="/css/styles.css" />
	<link rel="stylesheet" type="text/css"
		  href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"/>
	<link type="text/css" rel="stylesheet" href="/css/font-awesome.css" />
</head>
<body>`
}
