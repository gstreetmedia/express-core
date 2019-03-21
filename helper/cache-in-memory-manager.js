const cacheManager = require('cache-manager');

const config= {store: 'memory', max: 1000, ttl: 120/*seconds*/};
const manager = cacheManager.caching(config);
const cachePrefix = process.env.CACHE_PREFIX || "core";
const setFunction= manager.set;
const getFunction = manager.get;
const resetFunction = manager.reset;
const destroyFunction = manager.del;

exports.set = async (key, value, ttl) => {
	return await setFunction(
		"memory_" + cachePrefix + "_" + key, value,
		{
			ttl : ttl || 60
		}
	);
} ;

exports.get = async (key) => {
	return await getFunction(
		"memory_" + cachePrefix + "_" + key
	);
};

exports.reset = async() => {
	return await resetFunction();
};

exports.del = async(key) => {
	return await destroyFunction("memory_" + cachePrefix + "_" + key);
}