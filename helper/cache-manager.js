let CacheManager = require("./cache/CacheManager");
/**
 * @type {CacheManager}
 * @deprecated - Please use ./cache/CacheManager
 */
module.exports = new CacheManager(
	{
		type : process.env.CORE_CACHE_REDIS ? "redis" : "memory",
		prefix : process.env.CORE_CACHE_PREFIX,
		duration: process.env.CORE_CACHE_DURATION_SHORT || 60,
		connectionString : process.env.CORE_CACHE_REDIS
	}
);
