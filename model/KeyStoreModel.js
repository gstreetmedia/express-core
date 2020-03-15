const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');
const moment = require("moment-timezone");

class KeyStoreModel extends ModelBase {


	async set(key, value, ttl) {

		let record = await this.findOne(
			{
				where : {
					key : key
				}
			}
		);

		if (!record) {
			if (typeof value === "object") {
				let result = await this.create(
					{
						key : key,
						object : value,
						ttl : ttl ? ttl : null
					}
				)
			} else {
				let result = await this.create(
					{
						key : key,
						value : "" + value,
						ttl : ttl ? ttl : null
					}
				)
			}
		}
		if (record) {
			if (typeof value === "object") {
				let result = await this.update(
					record.id,
					{
						key : key,
						object : value,
						ttl : ttl ? ttl : record.ttl ? record.ttl : null
					}
				)
			} else {
				let result = await this.create(
					record.id,
					{
						key : key,
						value : "" + value,
						ttl : ttl ? ttl : record.ttl ? record.ttl : null

					}
				)
			}
		}
	}

	async get(key) {
		let result = await this.findOne(
			{
				where : {
					key : key
				}
			}
		);
		if (result) {
			if (result.ttl) {
				let expiresAt = moment(result.updatedAt).add(result.ttl, "seconds");
				let duration = expiresAt.diff(moment(), 'seconds');
				//console.log(duration);
				if (duration < 0) {
					await this.destroy(result.id);
					return null;
				}
			}
			if (result.object) {
				return result.object;
			}
			return result.value;
		} else {
			return null;
		}
	}

	async destroy(key) {
		let result = await super.destroy(
			{
				where : {
					key : key
				}
			}
		);
		return result;
	}

}

module.exports = KeyStoreModel;