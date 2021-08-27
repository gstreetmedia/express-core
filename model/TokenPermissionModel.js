const ModelBase = require('./ModelBase');
const _ = require('lodash');

module.exports = class TokenPermissionModel extends ModelBase {

	constructor(req) {
		super(req);
	}

	get tableName() { return '_token_permissions'; }

	async create(data){
		return await super.create(data);
	}

	async read(id, query){
		return await super.read(id, query);
	}

	async update(id, data, fetch){
		return await super.update(id, data, fetch);
	}

	async query(query){
		return await super.query(query);
	}

	async destroy(id){
		return await super.destroy(id);
	}

	get foreignKeys () {
		return {
			tokenId : {
				modelClass : "TokenModel",
				to : "id"
			}
		}
	}

}
