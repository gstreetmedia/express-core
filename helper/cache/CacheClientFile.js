const fs = require("fs");
const path = require("path");
const beautify = require("json-beautify");
const CacheClient = require("./CacheClient");

class CacheClientFile extends CacheClient{

	constructor(cachePrefix) {
		super(cachePrefix);
		this.path = process.env.CORE_CACHE_PATH || global.appRoot + "/cache/" + this.cachePrefix;
		if (!fs.existsSync(path.resolve(this.path))) {
			fs.mkdirSync(path.resolve(this.path), { recursive: true });
		}
	}

	getKey(key) {
		return key.replace(this.cachePrefix + "_","");
	}

	async get(key) {
		let result;
		try {
			result = await fs.promises.readFile(path.resolve(this.path + "/" + this.getKey(key) + ".json"));
		} catch (e) {
			return null;
		}
		return result;
	}

	async set(key, value) {
		await fs.promises.writeFile(path.resolve(this.path + "/" + this.getKey(key) + ".json"), value);
		return "OK";
	}

	async del(key) {
		try {
			await fs.promises.rm(path.resolve(this.path + "/" + this.getKey(key) + ".json"));
		} catch (e) {
		}
		return "OK";
	}

	async keys() {
		let keys = fs.promises.readdir(this.path);
		(await keys).forEach(
			(key, index) => {
				keys[index].replace(".json","");
			}
		)
		return key;
	}

	/**
	 * @returns {Promise<CacheClientFile>}
	 */
	async getClient(someValue) {
		return this;
	}
}

module.exports = CacheClientFile;
