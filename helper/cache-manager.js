const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-redis');
let config;
let manager;
let cachePrefix = process.env.CACHE_PREFIX || "core";

if (process.env.CACHE_REDIS) {
	console.log("redis " + process.env.CACHE_REDIS);
	config = {
		store: redisStore,
		url: process.env.CACHE_REDIS,
		db: 0,
		ttl: 120
	};
	manager = cacheManager.caching(config);
	manager.store.events.on('redisError', function(error) {
		// handle error here
		console.log(error);
	});

} else {
	config = {store: 'memory', max: 1000, ttl: 120/*seconds*/};
	manager = cacheManager.caching(config);
}

exports.set = async (key, value, ttl) => {
	return await manager.set(
		cachePrefix + "_" + key, value,
		{
			ttl : ttl || 60
		}
	);
} ;

exports.get = async (key) => {
	return await manager.get(
		cachePrefix + "_" + key
	);
}

exports.reset = async () => {
	return await manager.reset
}