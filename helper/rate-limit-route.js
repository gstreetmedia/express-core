const redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

let fail = async () => {
	return false;
};
let clear = async () => {
	return false;
};
let check = async () => {
	return true;
};


if (process.env.CACHE_REDIS) {
	const redisClient = redis.createClient({
		enable_offline_queue: true,
	});

	const limiter = new RateLimiterRedis({
		redis: redisClient,
		keyPrefix: 'rate_limit_route',
		points: 5,
		duration: 60 * 60 * 3, // Store number for three hours since first fail
		blockDuration: 60 * 15, // Block for 15 minutes
	});

	check = async(route, parameter) => {
		const rateLimitParameter = await limiter.get(route + "_" + parameter);

		if (rateLimitParameter !== null && rateLimitParameter.remainingPoints <= 0) {
			const retrySecs = Math.round(rateLimitParameter.msBeforeNext / 1000) || 1;
			return retrySecs;
		}

		return true;
	};

	fail = async(route, parameter) => {
		await limiter.consume(route + "_" + parameter);
	};

	clear = async(route, parameter) => {
		await limiter.delete(route + "_" + parameter);
	};
}


exports.check = check;
exports.fail = fail;
exports.clear = clear;