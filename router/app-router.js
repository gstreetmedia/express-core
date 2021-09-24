let router = require('express').Router();
let routes = {
	"admin-router" : "admin",
	"_config-router" : "_config",
	"_fields-router" : "_field",
	"_key-store-router" : "_key-store",
	"_roles-router" : "_role",
	"_role-permissions-router" : "_role-permission",
	"_tokens-router" : "_token",
	"_token-permissions-router" : "_token-permission",
	"_token-roles-router" : "_token-role",
	"_users-permissions-router" : "user-permission",
	"_users-roles" : "user-role",
	"_users-router" : "user",
	"_schemas-router" : "_schema",
	"_sessions-router" : "_session"
};
Object.keys(routes).forEach(
	(key)=> {
		const handler = require("./" + key);
		const route = "/" + routes[key];
		router.use(route, handler);
	}
);

exports.router = router;
exports.routes = routes;
