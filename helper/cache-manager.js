const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-redis');
let config;

if (0 && process.env.CACHE_REDIS) {
	console.log("redis " + process.env.CACHE_REDIS);
	config = {
		store: redisStore,
		url: process.env.CACHE_REDIS,
		db: 0,
		ttl: 120
	};
} else {
	config = {store: 'memory', max: 1000, ttl: 120/*seconds*/};
}

let manager = cacheManager.caching(config);

if (0 && process.env.CACHE_REDIS) {
	manager.store.events.on('redisError', function(error) {
		// handle error here
		console.log(error);
	});
}

module.exports = manager;

/*

exports.set = async function(key, value, ttl) {
	return await manager.set(
		"MEMBIO_ACTIONS_" + key, value,
		{
			ttl : ttl || 60
		}
	);
} ;

exports.get = async function(key) {
	return await manager.get(
		"MEMBIO_ACTIONS_" + key
	);
} ;

*/