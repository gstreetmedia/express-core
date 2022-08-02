const CacheManager = require("../helper/cache/CacheManager");
const md5 = require("md5");

class CacheableBase {

	constructor(props) {

	}

	/**
	 * @returns {CacheManager}
	 * @deprecated - use this.cacheManager
	 */
	get cache() {
		return this.cacheManager;
	}

	/**
	 * @returns {CacheManager}
	 */
	get cacheManager() {
		if (!this._cacheManager) {
			this._cacheManager = new CacheManager(
				{
					type: process.env.CORE_CACHE_REDIS ? "redis" : "memory",
					prefix: process.env.CORE_CACHE_PREFIX,
					duration: process.env.CORE_CACHE_DURATION_SHORT || 60
				}
			);
		}
		return this._cacheManager;
	}

	/**
	 * Generate a unique cache key for this request
	 * @param {*} object - a query, or some other unique
	 * @param id
	 * @returns {string}
	 */
	getCacheKey(object, id) {
		let cacheKey = this.constructor.name;
		if (id) {
			cacheKey += "_" + id;
		}
		if (object) {
			if (typeof object === "object") {
				cacheKey += "_" + md5(JSON.stringify(object));
			} else {
				cacheKey += "_" + object;
			}
		}
		return cacheKey.toLowerCase();
	}
}

module.exports = CacheableBase;
