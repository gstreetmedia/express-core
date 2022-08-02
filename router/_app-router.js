let router = require('express').Router();
let routes = {
	"admin-router" : "admin",
	"_config-router" : "_config",
	"_cache-router" : "_cache",
	"_fields-router" : "_field",
	"_key-store-router" : "_key-store",
	"_roles-router" : "_role",
	"_role-permissions-router" : "_role-permission",
	"_tokens-router" : "_token",
	"_token-permissions-router" : "_token-permission",
	"_token-roles-router" : "_token-role",
	"_user-permissions-router" : "_user-permission",
	"_user-roles-router" : "_user-role",
	"_users-router" : "_user",
	"_schemas-router" : "_schema",
	"_sessions-router" : "_session"
};
Object.keys(routes).forEach(
	(key)=> {

		const handler = require(global.appRoot + "/src/core/router/" + key);
		const route = "/" + routes[key];
		router.use(route, handler);
	}
);

exports.router = router;
exports.routes = routes;
