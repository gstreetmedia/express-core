class CacheClient {

	constructor(cachePrefix) {
		this.cachePrifx = cachePrefix || process.env.CORE_CACHE_PREFIX || "core";
	}

	/**
	 * @param someValue
	 * @returns {Promise<object>}
	 */
	async getClient(someValue) {
		return this;
	}

	/**
	 * Get a kye
	 * @param key
	 * @returns {Promise<*>}
	 */
	async get(key) {

	}

	/**
	 * Set a key
	 * @param key
	 * @param value
	 * @returns {Promise<string>}
	 */
	async set(key, value) {

	}

	/**
	 * Delete a key
	 * @param key
	 * @returns {Promise<string>}
	 */
	async del(key) {

	}

	/**
	 * Get a list of all keys
	 * @returns {Promise<array>}
	 */
	async keys() {

	}
}

module.exports = CacheClient;
