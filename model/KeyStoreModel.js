const ModelBase = require('./ModelBase');
const _ = require('lodash');
const moment = require("moment-timezone");
const cacheManager = require("../helper/cache-manager");

class KeyStoreModel extends ModelBase {

	get tableName () {
		return '_key_store'
	}

	/**
	 *
	 * @param key
	 * @param value
	 * @param ttl
	 * @returns {Promise<void>}
	 */
	async set(key, value, ttl) {

		await cacheManager.del(this.getCacheKey(null, key));

		let result;
		let record = await this.findOne(
			{
				where : {
					key : key
				}
			}
		);

		if (!record) {
			if (typeof value === "object") {
				result = await this.create(
					{
						key : key,
						object : value,
						ttl : ttl ? ttl : null
					}
				)
			} else {
				result = await this.create(
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
				result = await this.update(
					record.id,
					{
						key : key,
						object : value,
						ttl : ttl ? ttl : record.ttl ? record.ttl : null
					}
				)
			} else {
				result = await this.update(
					record.id,
					{
						key : key,
						value : "" + value,
						ttl : ttl ? ttl : record.ttl ? record.ttl : null
					}
				)
			}
		}

		return result;
	}

	/**
	 *
	 * @param key
	 * @returns {Promise<null|*>}
	 */
	async get(key, cache) {
		let cacheKey = this.getCacheKey(null, key);
		let value = await cacheManager.get(key);

		if (value) {
			return value;
		}

		let result = await this.findOne({
			where : {
				key : key
			}
		});

		if (result) {
			if (result.ttl) {
				let expiresAt = moment(result.updatedAt).add(result.ttl, "seconds");
				let duration = expiresAt.diff(moment(), 'seconds');
				if (duration < 0) {
					await this.destroy(result.id);
					return null;
				}
			}
			if (result.object) {
				await cacheManager.set(key, result.object, 600);
				return result.object;
			}
			await cacheManager.set(key, result.value, 600);
			return result.value;
		} else {
			return null;
		}
	}

	async destroy(key) {
		await cacheManager.del(this.getCacheKey(null, key));
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
