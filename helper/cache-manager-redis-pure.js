let config;
let manager;
let cachePrefix = process.env.CACHE_PREFIX || process.env.CORE_CACHE_PREFIX || "core";

let setFunction;
let getFunction;
let resetFunction;
let destroyFunction;
let clearFunction;

if (process.env.CACHE_REDIS || process.env.CORE_CACHE_REDIS) {
	const redis = require("redis");
	const util = require('util');


	const connectionStringParser = require("./connection-string-parser");
	const cs = connectionStringParser(process.env.CACHE_REDIS || process.env.CORE_CACHE_REDIS);

	console.log(cs);

	let client = new redis.createClient(
		{
			host : cs.host
		}
	);

	client.on('error', function(error) {
		console.log("Redis Error @ => " + new Date().toUTCString());
		console.log(error);
	});

	setFunction = async(key, value, ttl) => {

		return new Promise(function (resolve, reject) {
			let storedValue;
			try {
				storedValue = JSON.stringify(value)
			} catch (e) {
				storedValue = value;
			}

			console.log("set " + key + " => " + value);

			client.set(key, storedValue, 'EX', 120, (err)=> {
				console.log(err);

			});

			resolve(true);
		})
	};

	getFunction = async(key) => {
		return new Promise(function (resolve, reject) {
			client.get(key,
				function (value) {
				console.log(key + " => " + value);
					try {
						resolve(JSON.parse(value));
					} catch (e) {
						resolve(value);
					}
				}
			);
		})
	};

	resetFunction = async(key, value, ttl) => {
		return await setFunction(key, value, ttl);
	};

	destroyFunction = async(key) => {
		return new Promise(function (resolve, reject) {
			client.del(key,
				function (err, value) {
					if (err) {
						reject(err);
					} else {
						resolve(true);
					}
				}
			);
		})
	};

	clearFunction = async()=> {
		client.keys(cachePrefix + "_*",
			(err, list) => {
				if (err) {
					reject(err);
				} else {
					for (i = 0; i < list.length; i++) {
						client.del(list[i]);
					}
				}
			}
		);

	}


} else {
	const cacheManager = require('cache-manager');
	config = {store: 'memory', max: 1000, ttl: 120/*seconds*/};
	manager = cacheManager.caching(config);
	setFunction = manager.set;
	getFunction = manager.get;
	destroyFunction = manager.del;
	resetFunction = manager.reset;
	clearFunction = manager.clear;
}

exports.set = async (key, value, ttl) => {
	return await setFunction(
		cachePrefix + "_" + key, value,
		{
			ttl : ttl || 60
		}
	);
} ;

exports.get = async (key) => {
	return await getFunction(
		cachePrefix + "_" + key
	);
};

exports.reset = async() => {
	await resetFunction();
};

exports.del = async(key) => {
	console.log("cache-manager::del " + key)
	await destroyFunction("memory_" + cachePrefix + "_" + key);
};

exports.clear = () => {
	clearFunction();
};