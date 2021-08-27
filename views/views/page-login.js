/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
    let header = await o.getView("header");
    let footer = await o.getView("footer");
    return `
${ await o.renderView(header, o) }    
<div class="container login-view">
	<div class="row">
		<div class="col-lg-4 col-md-8 col-sm-12 ml-auto mr-auto">
			<form class="form form-signin"
				  method="POST"
				  action="${ global.apiRoot }/user/login"
				  data-success="/admin"

			>
				<div class="card">
					<div class="card-body">
						<img class="mb-0" width="100%" height="72" src="/img/express-core-logo.svg">
						<label for="email" class="sr-only">Email address</label>
						<input type="email" name="email" class="form-control" placeholder="Email address" required autofocus>
						<label for="password" class="sr-only">Password</label>
						<input type="password" name="password" class="form-control" placeholder="Password" required>
						<div class="checkbox mb-3">
							<label>
								<input type="checkbox" name="rememberMe" value="yes"> Remember me
							</label>
						</div>
						<button class="btn btn-lg btn-primary btn-block" type="submit">Sign in</button>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
${ await o.renderView(footer, o) }    
`
}
