let data = {};
const CacheClient = require("./CacheClient");

class CacheClientMemory extends CacheClient {

	constructor(cachePrefix) {
		super(cachePrefix);
	}

	async get(key) {
		return data[this.cachePrefix + "_" + key];
	}

	async set(key, value) {
		data[this.cachePrefix + "_" + key] = value;
		return "OK";
	}

	async del(key) {
		delete data[this.cachePrefix + "_" + key];
		return "OK";
	}

	async keys() {
		return Object.keys(data)
	}

	/**
	 * @returns {Promise<CacheClientMemory>}
	 */
	async getClient(someValue) {
		return this;
	}
}

module.exports = CacheClientMemory;
