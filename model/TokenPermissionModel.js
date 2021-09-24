const ModelBase = require('./ModelBase');

class TokenPermissionModel extends ModelBase {

	get tableName() { return '_token_permissions'; }

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

module.exports = TokenPermissionModel;
