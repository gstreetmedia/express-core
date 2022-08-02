let client = {};
let moment = require("moment-timezone");
let cacheClientRedis;

let getRedisClient = async(connectionString) => {
	if (!cacheClientRedis) {
		console.log("CacheManager::create Redis Client")
		const Client = require("./CacheClientRedis");
		cacheClientRedis = new Client();
	}
	return cacheClientRedis.getClient(connectionString);
}

let getMemoryClient = async () => {
	if (!client.memory) {
		console.log("CacheManager::create Memory Client")
		let Client = require("./CacheClientMemory");
		let c = new Client();
		client.memory = await c.getClient();
	}
	return client.memory;
}

let getFileClient = async () => {
	if (!client.file) {
		console.log("CacheManager::create File Client")
		let Client = require("./CacheClientFile");
		let c = new Client();
		client.file = await c.getClient();
	}
	return client.file;
}

class CacheManager {

	/**
	 * @param options
	 */
	constructor(options) {
		if (options.type) {
			this.type = options.type;
		}
		if (options.duration) {
			this.duration = options.duration;
		} else {
			this.duration = process.env.CORE_CACHE_DURATION_SHORT || 60;
		}
		if (options.prefix) {
			this.prefix = options.prefix;
		} else {
			this.prefix = process.env.CORE_CACHE_PREFIX || "core";
		}
		if (options.connectionString) {
			this.connectionString = options.connectionString;
		} else {
			this.connectionString = process.env.CORE_CACHE_REDIS;
		}
	}

	/**
	 * @param type
	 * @returns {Promise<*>}
	 */
	async getClient(type){
		type = type || this.type;
		switch (type) {
			case "memory" :
				return await getMemoryClient();
			case "redis" :
				if (this.connectionString) {
					return await getRedisClient(this.connectionString);
				}
			default :
				return await getFileClient();

		}
	}

	/**
	 * @param key
	 * @returns {string}
	 */
	getKey(key) {
		return this.prefix + "_" + key;
	}

	/**
	 * @param {string} key
	 * @returns {Promise<*>}
	 */
	async get(key) {
		let client = await this.getClient();
		let o = await client.get(this.getKey(key));

		if (!o) {
			return null;
		}

		try {
			o = JSON.parse(o);
		} catch (e) {
			await client.del(this.getKey(key));
			return null;
		}

		if (o.expiration && o.expiration !== 0) {
			let expiration = moment.tz(o.expiration, "UTC");
			if (expiration.isBefore(moment.tz("UTC"))) {
				await client.del(this.getKey(key));
				return null;
			}
		}

		return o.value;
	}

	/**
	 * @param {string} key
	 * @param {*} value - the value you'd like to store for quick retrieval
	 * @param {number} [ttl] - time to live in seconds
	 * @returns {Promise<string>}
	 */
	async set(key, value, ttl) {
		let client = await this.getClient();
		let expiration;
		if (ttl === 0) {
			expiration = 0;
		} else if (ttl > 0 || !ttl) {
			expiration = moment.tz("UTC").add(ttl || this.duration, "seconds").format()
		}
		let o = {
			value : value,
			expiration : expiration,
		};
		return await client.set(this.getKey(key), JSON.stringify(o)) === "OK";
	}

	/**
	 * Delete a key from the cache
	 * @param {string} key
	 * @returns {Promise<string>}
	 */
	async destroy(key) {
		let client = await this.getClient();
		await client.del(this.getKey(key));
	}

	/**
	 * @deprecated - Please use destroy
	 * @param key
	 * @returns {Promise<string>}
	 */
	async delete(key) {
		return this.destroy(key);
	}

	/**
	 * Clears all keys with the current prefix
	 * @returns {Promise<array>}
	 */
	async reset(startsWith) {
		let client = await this.getClient();
		let keys = await client.keys("*");
		let deleted = [];
		while(keys.length > 0) {
			if (keys[0].indexOf(startsWith ? this.prefix + "_" + startsWith : this.prefix) === 0) {
				await client.del(keys[0]).then(() => {
					deleted.push(keys[0])
				});
			}
			keys.shift();
		}
		return {
			deleted : deleted
		};
	}

	/**
	 * Clears all keys with the current prefix
	 * @returns {Promise<string>}
	 */
	async clear() {
		return await this.reset();
	}
}

module.exports = CacheManager;
