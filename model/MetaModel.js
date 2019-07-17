const ModelBase = require('../core/model/ModelBase');
const _ = require('lodash');
const moment = require("moment-timezone");
const now = require("../helper/now");

module.exports = class MetaModel extends ModelBase {


	async set(id, key, value, isUnique, ttl) {

		isUnique = isUnique === false ? false : true;

		let record = await this.findOne(
			{
				where : {
					key : key,
					objectId : id
				}
			}
		);

		let expiresAt = null;
		if (ttl) {
			expiresAt = moment().tz("UTC").add(ttl, "seconds");
		}

		if (!record || record.isUnique === false) {
			if (typeof value === "object") {
				let result = await this.create(
					{
						key : key,
						object : value,
						objectId : id,
						expiresAt : expiresAt
					}
				)
			} else {
				let result = await this.create(
					{
						key : key,
						value : "" + value,
						objectId : id,
						expiresAt : expiresAt
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
						objectId : id,
						expiresAt : expiresAt ? expiresAt : record.expiresAt ? record.expiresAt : null,
						isUnique : isUnique || true
					}
				)
			} else {
				let result = await this.create(
					record.id,
					{
						key : key,
						value : "" + value,
						objectId : id,
						expiresAt : expiresAt ? expiresAt : record.expiresAt ? record.expiresAt : null,
						isUnique : isUnique || true

					}
				)
			}
		}
	}

	async get(id, key) {
		let result = await this.find(
			{
				where : {
					key : key,
					objectId : id,
					or : [
						{expiresAt : null},
						{expiresAt : {">" : now()}}
					]
				}
			}
		);
		if (result) {
			if (result.length === 1 && result[0].isUnique === true) {
				result = result[0];
				if (result[0].object) {
					return result[0].object;
				}
				return result[0].value;
			}
			let values = [];
			result.forEach(
				function(item) {
					if (item.object) {
						values.push(item.object);
					}
					return values.push(item.value);
				}
			);
			return values;
		} else {
			return null;
		}
	}

	async destroy(id, key) {
		let result = await super.destroy(
			{
				where : {
					key : key,
					objectId : id,
				}
			}
		);
		return result;
	}

	async purge() {
		let result = await super.destroy(
			{
				where : {
					expiresAt : {"<" : now()}
				}
			}
		);
	}

}