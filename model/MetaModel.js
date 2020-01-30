const ModelBase = require('../model/ModelBase');
const _ = require('lodash');
const moment = require("moment-timezone");
const now = require("../helper/now");

class MetaModel extends ModelBase {


	/**
	 * Store a simple key / value pair or key / object or key / value / object pair
	 * @param objectId
	 * @param key
	 * @param value
	 * @param object
	 * @param isUnique
	 * @param secondsToLive
	 * @returns {Promise<null>}
	 */
	async set(objectId, key, value, isUnique, secondsToLive) {

		if (!objectId) {
			return null;
		}

		if (!key) {
			return null;
		}

		if (isUnique !== false) {
			isUnique = true;
		}

		let object = null;
		if (typeof value === "object") {
			object = value;
			value = null;
		} else if (typeof value !== "string") {
			object = {"_value" : value}
		}

		let record = await this.find({
			where : {
				objectId : objectId,
				key : key
			}
		});

		if (record.length === 0) {
			let result = await this.create(
				{
					objectId : objectId,
					key : key,
					value : value,
					object : object,
					isUnique : !!isUnique,
					expiresAt : _.isNumber(secondsToLive) ? moment().add(secondsToLive, "seconds").tz("UTC").toISOString() : null
				}
			)
		} else {
			if (record.length === 1 && record[0].isUnique) {
				let result = await this.update(
					record[0].id,
					{
						key: key,
						value : value,
						object : object,
						expiresAt: _.isNumber(secondsToLive) ? moment().add(secondsToLive, "seconds").tz("UTC").toISOString() : null
					}
				);
			} else {
				while (record.length > 0) {
					if (record[0].value !== value && record[0].object === object) {
						this.create(
							{
								objectId : objectId,
								key : key,
								value : value,
								object : object,
								isUnique : !!isUnique,
								expiresAt : _.isNumber(secondsToLive) ? moment().add(secondsToLive, "seconds").tz("UTC").toISOString() : null
							}
						)
					}
				}
			}
		}
	}

	/**
	 * Get a key
	 * @param objectId
	 * @param key
	 * @returns {Promise<*>}
	 */
	async get(objectId, key) {
		let m = moment();

		let result = await this.find(
			{
				where : {
					objectId : objectId,
					key : key
				},
				select : ['id','key','value','object','expiresAt']
			},
			true
		);

		if (result.length > 0) {
			if (result[0].isUnique) {
				return result[0].value;
			} else {
				return _.map(result, "value");
			}
		}
		return null;
	}

	/**
	 * Clean up the value, remove expired
	 * @param data
	 * @returns {Promise<void>}
	 */
	async afterFind(data) {
		let list = [];
		let deleteList = [];
		let context = this;

		data.forEach(
			function(item) {

				context.setValue(item);

				if (item.expiresAt) {
					if (!m.isAfter(item.expiresAt)) {
						list.push(item);
					} else {
						deleteList.push(item.id);
					}
				} else {
					list.push(item);
				}
			}
		);

		if (deleteList.length > 0) {
			await this.destroyWhere(
				{
					id : {"in" : deleteList}
				}
			)
		}
		data = list;
	}

	/**
	 * remove a key
	 * @param objectId
	 * @param key
	 * @param value
	 * @returns {Promise<void>}
	 */
	async unset(objectId, key, value) {
		if (!key && !value) {
			await this.destroyWhere(
				{
					where : {
						objectId : objectId
					}
				}
			)
		} else if (key && !value) {
			await this.destroyWhere(
				{
					where : {
						objectId : objectId,
						key : key
					}
				}
			)
		}  else if (key && value) {
			if (_.isObject(value)) {
				await this.destroyWhere(
					{
						where : {
							objectId : objectId,
							key : key,
							object : value
						}
					}
				)
			} else {
				await this.destroyWhere(
					{
						where : {
							objectId : objectId,
							key : key,
							value : value
						}
					}
				)
			}
		}
	}


	/**
	 * Parse to the object to return the correct value, either value, object._value or object
	 * @param meta
	 * @returns {*}
	 */
	setValue(meta) {
		//console.log(meta);
		if (meta.object === undefined) {
			delete meta.object;
			return;
		}
		if (meta.object && meta.object._value) {
			meta.value = meta.object._value
		} else if (meta.object) {
			meta.value = meta.object;
		}
		delete meta.object;
	}

}

module.exports = MetaModel;