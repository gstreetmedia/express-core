const _ = require("lodash");
const inflector = require("../helper/inflector");
const inflectFromRoute = require('../helper/inflect-from-route');

class RoleManager {

	/**
	 *
	 * @param {Request} req
	 * @param {Response} res
	 * @param {function} next
	 */
	constructor(req) {
		this.req = req;
	}

	get method() {
		return this.req.method;
	}

	get params() {
		return this.req.params;
	}

	get body() {
		return this.req.body;
	}

	get originalUrl() {
		return this.req.originalUrl;
	}

	get route() {
		return this.req.route;
	}

	get allowedRoles() {
		if (!this._allowedRoles) {
			this._allowedRoles = ['super-admin','super-api'];
		}

		return this._allowedRoles;
	}

	get currentRoles() {
		if (!this._currentRoles) {
			this._currentRoles = ['guest'];
		}
		return this._currentRoles;
	}

	get rolePermissions() {
		if (!this._rolePermissions) {
			this._rolePermissions = [];
		}
		return this._rolePermissions;
	}

	get permissionHash() {
		if (!this._permissionHash) {
			this._permissionHash = {};
		}
		return this._permissionHash;
	}

	/**
	 * Add a current requester role
	 * @param role
	 */
	addRole(role) {
		let context = this;
		if (_.isArray(role)) {
			role.forEach(
				function(item) {
					context.addRole(item);
				}
			)
		} else if (!this.currentRoles.includes(role)) {
			this.log("addRole", role);
			this.currentRoles.push(role);
		} else {
			this.log("addRole", "Already has role " + role);
		}
	};

	/**
	 * Allow a role for the current request
	 * @param role
	 */
	allowRole(role) {

		if (_.isString(role)) {
			if (!this.allowedRoles.includes(role)) {
				this.allowedRoles.push(role);
			}
		} else if (_.isArray(role)) {
			let context = this;
			role.forEach(
				function(item) {
					context.allowRole(item);
				}
			)
		}
	};
	/**
	 * Remove a current requester role
	 * @param role
	 */
	removeRole(role) {
		let index = _.indexOf(this.currentRoles, role);
		if (index !== -1) {
			this.currentRoles.splice(index, 1);
		}
	};
	/**
	 * Add one or more roles allowed for this request
	 * @param role
	 */
	disallowRole (role) {
		let index =_.indexOf(this.allowedRoles, role);
		if (index !== -1) {
			this.allowedRoles.splice(index, 1);
		}
	};

	/**
	 * Does the current request have the allowed role
	 * @param role
	 * @returns {boolean}
	 */
	hasRole(role) {
		if (!_.isArray(role)) {
			role = [role];
		}
		return _.intersection(this.currentRoles, role).length > 0;
	};

	/**
	 * Add the permissions for a role
	 * @param roles
	 */
	addRolePermissions(roles){
		let context = this;
		roles.forEach(
			function(item) {
				if (item.rolePermissions) {
					context.addPermissions(item.rolePermissions);
				}
				if (item.tokenPermissions) {
					context.addPermissions(item.tokenPermissions);
				}
				if (item.name) {
					context.addRole(item.name);
				}
			}
		)
	}

	/**
	 * Add route, table, object permissions
	 * @param permission
	 */
	addPermissions(permission){
		let context = this;
		if (_.isArray(permission)) {
			permission.forEach(
				function(item) {
					context.addPermissions(item);
				}
			)
		} else if (!this.permissionHash[permission.id]) {
			this.rolePermissions.push(permission);
			this.log("addPermissions", permission);
			this.permissionHash[permission.id] = true;
		}
	};


	/**
	 * Check the the current role is allowed on this request
	 * @param {string} role - optional role to allow for this request
	 * @returns {boolean}
	 */
	checkRole(role){

		if (role) {
			this.allowRole(role);
		}

		this.req.notAuthorized = false;

		let requestPath = this.originalUrl.replace(/\?.*$/, '');
		let endPointBase = requestPath.split("/")[1];
		let currentRoute = endPointBase + (this.route.path !== "/" ? this.route.path : '');

		this.log("checkRole", "currentRoute => [" + this.method + "] " + currentRoute);
		this.log("checkRole", "requestPath => " + requestPath);

		//Role level permissions. If allowRole(SOMEROLE) was used and the current role matches.
		let matchingRoles = _.intersection(this.allowedRoles, this.currentRoles);
		if (matchingRoles.length > 0) {
			this.log("checkRole", "Role Permission => [" + this.method + "] " + currentRoute + " -> " + matchingRoles);
			return true;
		}

		let className = inflector.camelize(inflector.underscore(endPointBase), true);
		let tableName = inflectFromRoute.table(endPointBase);

		this.log("checkRole", "className => " + className);
		this.log("checkRole", "tableName => " + tableName);

		//see if token has blanket permissions
		let permissions = _.filter(this.rolePermissions, {objectType:"*"});

		if (permissions.length > 0) {
			this.log("checkRole", "Token Permission => [" + this.method + "] " + currentRoute);
			this.routePermissions = permissions;
			return true;
		}

		//Route Level Permissions
		let filter = {route:currentRoute};
		permissions = _.filter(
			this.rolePermissions,
			(role) => {
				if (!role.route) {
					return false;
				}
				if (role.route.indexOf(currentRoute) === -1) {
					return false;
				}
				switch (this.method) {
					case "POST" :
						return role.c !== false;
					case "GET" :
						return role.r !== false;
					case "PATCH" :
					case "PUT" :
						return role.u !== false;
					case "DELETE" :
						return role.d !== false;
				}
			}
		);

		if (permissions.length > 0) {
			this.log("checkRole", "Route Permission => [" + this.method + "] " + currentRoute);
			this.routePermissions = permissions;
			return true;
		}

		//Table Level Permissions
		permissions = _.filter(
			this.rolePermissions,
			(role) => {
				if (tableName === role.objectType) {
					switch (this.method) {
						case "POST" :
							return role.c !== false;
						case "GET" :
							return role.r !== false;
						case "PATCH" :
						case "PUT" :
							return role.u !== false;
						case "DELETE" :
							return role.d !== false;
					}
				}
			}
		);

		if (permissions.length > 0) {
			this.log("checkRole", "Table Permission => [" + this.method + "] " + currentRoute);
			this.routePermissions = permissions;
			return true;
		}

		//Object Level Permissions
		if (this.params.id) {
			permissions = _.filter(
				this.rolePermissions,
				(role) => {
					if ([currentRoute,tableName,className].indexOf(role.objectType) !== -1) {
						if (role.objectId === null || role.objectId !== this.params.id) {
							return false;
						}
						switch (this.method) {
							case "POST" :
								return role.c !== false;
							case "GET" :
								return role.r !== false;
							case "PATCH" :
							case "PUT" :
								return role.u !== false;
							case "DELETE" :
								return role.d !== false;
						}
					}
				}
			);
		}

		if (permissions.length > 0) {
			this.log("checkRole", "Object Permission => [" + this.method + "] " + currentRoute);
			return true;
		}

		if (permissions.length === 0) {
			this.log("checkRole", this.currentRoles.join(",") + " not allowed to route => " + [currentRoute,tableName,className].join(" or "));
			//console.log(req.accountPermissions);
		}

		if (this.req) {
			this.req.notAuthorized = true;
		}

		return false;
	};

	log(method, message) {
		if (this.debug) {
			if (message && typeof message === "object") {
				message = JSON.stringify(message);
			}
			console.log("RoleManager" + (method ? "::" + method : "") + (message ? " -> " + message : ""));
		}
	}
}

module.exports = RoleManager;
