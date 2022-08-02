const redis = require("redis");
const md5 = require("md5");
const CacheClient = require("./CacheClient");
let client = {};

class CacheClientRedis extends CacheClient {

	constructor(cachePrefix) {
		super(cachePrefix);
	}
	/**
	 * @param connectionString
	 * @returns {CacheClient}
	 */
	async getClient(connectionString) {
		let key = md5(connectionString || 'redis://127.0.0.1:6379');
		if (!client[key]) {
			let redis;
			try {
				redis = require("redis");
			} catch (e) {
				return null;
			}
			client[key] = new redis.createClient(
				{
					url: connectionString || 'redis://127.0.0.1:6379'
				}
			);

			client[key].on('error', function (error) {
				console.log("Redis Error @ => " + new Date().toUTCString());
				console.log(error);
			});

			await client[key].connect();
		}
		return client[key];
	}
}

module.exports = CacheClientRedis;
