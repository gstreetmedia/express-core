const cacheManager = require('cache-manager');
const connectionStringParser = require("./connection-string-parser");

let config;
let manager;
let cachePrefix = process.env.CACHE_PREFIX || process.env.CORE_CACHE_PREFIX || "core";

let setFunction;
let getFunction;
let resetFunction;
let destroyFunction;

if (!manager) {
	if (process.env.CACHE_REDIS || process.env.CORE_CACHE_REDIS) {

		let connection = connectionStringParser(process.env.CACHE_REDIS || process.env.CORE_CACHE_REDIS);

		const redisStore = require('cache-manager-redis');
		config = {
			store: redisStore,
			host: connection.host,
			port : connection.port,
			db: 0,
			ttl: 120
		};
		manager = cacheManager.caching(config);
		manager.store.events.on('redisError', function(error) {
			// handle error here
			console.log("Redis Error @ => " + new Date().toUTCString());
			console.log(error);
		});

		manager.get(cachePrefix + "_" + "last_run", (err, value)=> {
			manager.set(cachePrefix + "_" + "last_run", new Date().getTime());
			console.log("last run => " + value);
		});

	} else {

		config = {store: 'memory', max: 1000, ttl: 120/*seconds*/};
		manager = cacheManager.caching(config);

		/*
		  setFunction = manager.set;
		  getFunction = manager.get;
		  destroyFunction = manager.del;
		  resetFunction = manager.reset;
		 */
	}
}


setFunction = (key, value, ttl) => {
  return new Promise(function (resolve, reject) {
    manager.set(cachePrefix + "_" + key, value, ttl, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};
getFunction = (key) => {
  return new Promise(function (resolve, reject) {
    manager.get(cachePrefix + "_" + key, function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
resetFunction = () => {
  return new Promise(function (resolve, reject) {
    manager.reset(function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

destroyFunction = (key) => {
  return new Promise(function (resolve, reject) {
    manager.del(key, function (err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

exports.set = async (key, value, ttl) => {
	//console.log("cache-manager set " + key);
	return await setFunction(
		cachePrefix + "_" + key, value,
		{
			ttl : ttl || process.env.CORE_CACHE_DURATION_SHORT || 60
		}
	);
} ;

exports.get = async (key) => {
	//console.log("cache-manager get " + key);
	return await getFunction(
		cachePrefix + "_" + key
	);
};

exports.reset = async() => {
	//console.log("reset");
	return await resetFunction();
};

exports.del = async(key) => {
	console.log("cache-manager::del " + key)
	await destroyFunction("memory_" + cachePrefix + "_" + key);
	console.log("cache-manager::deleted")
	return;
}