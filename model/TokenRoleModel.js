const ModelBase = require('./ModelBase');

class TokenRoleModel extends ModelBase {

	get tableName() { return '_token_roles'; }

	async afterCreate(id, data) {
		if (data.tokenId) {
			await cache.del('authentication_token_' + data.tokenId);
		}
	}

	async afterUpdate(id, data) {
		if (data.tokenId) {
			await cache.del('authentication_token_' + data.tokenId);
		}
	}
}

module.exports = TokenRoleModel;
