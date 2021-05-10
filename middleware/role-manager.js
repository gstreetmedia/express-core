const _ = require("lodash");
const inflector = require("../helper/inflector");

module.exports = function (req, res, next) {
	req.allowedRoles = ['super-admin','super-api'];
	req.currentRoles = ['guest'];

	req.rolePermissions = [];
	let rolePermissionHash = {};


	/**
	 * Add a current requester role
	 * @param role
	 */
	req.addRole = function(role) {
		if (_.isArray(role)) {
			role.forEach(
				function (item) {
					req.addRole(item);
				}
			)
		} else if (typeof role === "object") {
			if (role.name) {
				req.addRole(role.name);
			}
			if (role.permissions) {
				req.addPermissions(role.permissions);
			}
		} else if (!req.currentRoles.includes(role)) {
			req.currentRoles.push(role);
		}
	};

	/**
	 * Remove a current requester role
	 * @param role
	 */
	req.removeRole = function(role) {
		let index =_.indexOf(req.currentRoles, req.role);
		if (index !== -1) {
			req.currentRoles.splice(index, 1);
		}
	};

	/**
	 * Add one or more roles allowed for this request
	 * @param role
	 */
	req.allowRole = function(role) {
		if (_.isString(role)) {
			if (_.indexOf(req.allowedRoles, role) === -1) {
				req.allowedRoles.push(role);
			}
		} else if (_.isArray(role)) {
			role.forEach(
				function(item) {
					req.allowRole(item);
				}
			)
		}
	};

	/**
	 * Remove an allowed role from this request
	 * @param role
	 */
	req.disallowRole = function (role) {
		let index =_.indexOf(req.allowedRoles, req.role);
		if (index !== -1) {
			req.allowedRoles.splice(index, 1);
		}
	};

	/**
	 * Check the the current role is allowed on this request
	 * @param req
	 * @returns {boolean}
	 */
	req.checkRole = function () {
		req.roleFailure = true;

		console.log(req.currentRoles)

		req.currentRoles.forEach(
			function(role) {
				if (_.indexOf(req.allowedRoles, role) !== -1) {
					req.roleFailure = false;
				}
			}
		);

		if (req.roleFailure === true) {
			return req.checkRoleForRoute()
		}

		return true;
	};

	/**
	 * Does the current requesting user / api have a specific role
	 * @param role
	 * @returns {boolean}
	 */
	req.hasRole = function(role) {
		if (!_.isArray(role)) {
			role = [role];
		}
		debug("intersection");
		debug(_.intersection(req.currentRoles, role));
		return _.intersection(req.currentRoles, role).length > 0;
	};

	req.addRolePermissions = (roles) => {
		roles.forEach(
			function(item) {
				req.addPermissions(item.permissions);
			}
		)
	};

	req.addPermissions = (permission) => {
		if (_.isArray(permission)) {
			permission.forEach(
				function(item) {
					req.addPermissions(item);
				}
			)
		} else if (!rolePermissionHash[permission.id]) {
			req.rolePermissions.push(permission);
			rolePermissionHash[permission.id] = true;
		}
	};

	/**
	 * Check the the current role is allowed on this request
	 * @param req
	 * @returns {boolean}
	 */
	req.checkRoleForRoute = () => {
		let requestPath = req.originalUrl.replace(/\?.*$/, '');
		let endPointBase = requestPath.split("/")[1];
		let currentRoute = endPointBase + (req.route.path !== "/" ? req.route.path : '');

		let baseName = inflector.classify(inflector.underscore(endPointBase));
		let altName = inflector.singularize(baseName);

		let className = inflector.camelize(inflector.underscore(endPointBase));
		let tableName = inflector.underscore(endPointBase);
		let tableNamePlural = inflector.pluralize(tableName);

		if (global.schemaCache[tableNamePlural]) {
			tableName = tableNamePlural;
		} else if (!global.schemaCache[tableName]) {
			tableName = null;
		}
		debug("checkRole requestPath => " + requestPath);
		debug("checkRole currentRoute => " + currentRoute);
		debug("checkRole className => " + className);
		debug("checkRole tableName => " + tableName);
		debug("checkRole method => " + req.method);

		//debug(req.headers);
		debug("current");
		debug(req.currentRoles);
		debug("allowed");
		debug(req.allowedRoles);
		debug(req.rolePermissions);

		//Role level permissions
		let matchingRoles = _.intersection(req.allowedRoles, req.currentRoles);
		if (matchingRoles.length > 0) {
			debug("Role level permissions");
			return true;
		}

		//see if token has blanket permissions
		let permissions = _.filter(req.rolePermissions, {objectType:"*"});
		if (permissions.length > 0) {
			debug("* permissions");
			req.routePermissions = permissions;
			return true;
		}

		//Route Level Permissions
		let filter = {route:currentRoute};
		permissions = _.filter(
			req.rolePermissions,
			(role) => {
				if (!role.route) {
					return false;
				}
				if (role.route.indexOf(currentRoute) === -1) {
					return false;
				}
				switch (req.method) {
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
			debug("Route Level Permissions");
			req.routePermissions = permissions;
			return true;
		}

		//Table Level Permissions
		permissions = _.filter(
			req.rolePermissions,
			(role) => {
				if (tableName === role.objectType) {
					switch (req.method) {
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
			debug("Table Level Permissions");
			req.routePermissions = permissions;
			return true;
		}

		//Object Level Permissions
		if (req.params.id) {
			permissions = _.filter(
				req.rolePermissions,
				(role) => {
					if ([currentRoute,tableName,className].indexOf(role.objectType) !== -1) {
						if (role.objectId === null || role.objectId !== req.params.id) {
							return false;
						}
						switch (req.method) {
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
			debug("Object Level Permissions");
			return true;
		}

		if (permissions.length === 0) {
			debug(req.currentRoles.join(",") + " not allowed to route => " + [currentRoute,tableName,className].join(" or "));
			debug(req.rolePermissions);
		}

		return false;
	};

	let debug = (message) => {
		if (req.debug === true) {
			console.log(message);
		}
	}

	next();
}
