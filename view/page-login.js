/**
 * @param {ViewObject} o
 * @returns {Promise<string>}
 */
module.exports = async (o) => {
    let header =  await o.getView("header");
    let footer = await o.getView("footer");
    return `
${ await o.renderView(header, o) }    
<div class="login-view wrapper-centered">
			<form class="form form-signin w-100"
				  method="POST"
				  action="${global.apiRoot}/user/login"
				  data-success="/admin" >
				<div class="card card-floating">
					<div class="card-body">
						<img class="mb-3" width="100%" height="72" src="/img/logo.svg">
						<div class="mb-3">
						    <label for="email" class="sr-only">Email address</label>
						    <input type="email" name="email" class="form-control" placeholder="Email address" required autofocus>
                        </div>
						<div class="mb-3">
						    <label for="password" class="sr-only">Password</label>
						    <input type="password" name="password" class="form-control" placeholder="Password" required>
						</div>
						<div class="checkbox mb-3">
							<label>
								<input type="checkbox" name="rememberMe" value="yes" checked> Remember me
							</label>
						</div>
						<button class="btn btn-lg btn-primary d-block w-100" type="submit">Sign in</button>
					</div>
				</div>
			</form>
		</div>
${ await o.renderView(footer, o) }    
`
}
