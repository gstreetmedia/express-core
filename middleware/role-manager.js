const _ = require("lodash");

module.exports = function (req, res, next) {
	req.allowedRoles = ['super-admin','super-api'];
	req.currentRoles = ['guest'];

	/**
	 * Add a current requester role
	 * @param role
	 */
	req.addRole = function(role) {
		if (_.isArray(role)) {
			role.forEach(
				function(item) {
					req.addRole(item);
				}
			)
		} else if (_.indexOf(req.currentRoles, role) === -1) {
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
		//console.log("currentRoles => " + req.currentRoles);
		//console.log("allowedRoles => " + req.allowedRoles);

		req.currentRoles.forEach(
			function(role) {
				if (_.indexOf(req.allowedRoles, role) !== -1) {
					req.roleFailure = false;
				}
			}
		);
		return !req.roleFailure;
	};

	/**
	 * Does the current requesting user / api have a specific role
	 * @param role
	 * @returns {boolean}
	 */
	req.hasRole = function(role) {
		return _.indexOf(req.currentRoles, role) === -1 ? false : true;
	};

	next();
}