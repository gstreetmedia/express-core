class Locals {

	/**
	 * @param {Request} req
	 */
	constructor(req) {
		this.req = req;
	}

	/**
	 *
	 * @returns {{id, secret: *, key, status}}
	 */
	get token() {
		return {
			id : this.req.local.token.id,
			key : this.req.local.token.key,
			secret : this.req.local.token.secret,
			status : this.req.local.token.status,
		}
	}

	get config() {
		return {
			id : this.req.local.config.id,
			name : this.req.local.config.key,
			settings : this.req.local.config.secret
		}
	}

	get user() {
		return this.req.locals.user
	}

	get jwt() {
		return this.req.locals.jwt
	}

	/**
	 *
	 * @returns {RoleManager}
	 */
	get roleManager() {
		return this.req.locals.roleManager
	}
}
