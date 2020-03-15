const cacheManager = require('cache-manager');
const connectionStringParser = require("./connection-string-parser");

let config;
let manager;
let cachePrefix = process.env.CACHE_PREFIX || "core";

let setFunction;
let getFunction;
let resetFunction;
let destroyFunction;

if (!manager) {
	if (process.env.CACHE_REDIS) {

		let connection = connectionStringParser(process.env.CACHE_REDIS);
		console.log("cache redis");
		console.log(connection);

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
getFunction = (key, value, ttl) => {
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
resetFunction = (key, value, ttl) => {
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
	console.log("cache-manager set " + key);
	return await setFunction(
		cachePrefix + "_" + key, value,
		{
			ttl : ttl || 60
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