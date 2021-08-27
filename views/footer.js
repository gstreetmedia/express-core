/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (data) => {
	return `
<footer class="footer container border-top pt-4 fixed-bottom">
	<div class="container">
		<div class="row mb-4">
			<div class="col-md-12 text-center ">
				&copy;${new Date().getFullYear()} Made by <a href="http://www.membio.com">Membio.js</a>.
			</div>
		</div>
	</div>
</footer>

<script src="//cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.1.3/js/bootstrap.js"></script>
<script src="/js/jquery.serialize.json.js"></script>
<script src="/js/login.js"></script>
</body>
</html>`
}
