let limiter;


if (process.env.CACHE_REDIS) {

	const redis = require('redis');
	const RateLimiterRedis = require('rate-limiter-flexible').RateLimiterRedis;
	const connectionStringParser = require("../helper/connection-string-parser");

	let connection = connectionStringParser(process.env.CACHE_REDIS);

	console.log("Rate limiter Redis");
	console.log(connection);

	const redisClient = redis.createClient({
		host: connection.host,
		port: connection.port,
		enable_offline_queue: false,
	});

	redisClient.on("error", (e) => {
		console.log("Could not connect to rate limiter route redis");
	});

	limiter = new RateLimiterRedis({
		redis: redisClient,
		keyPrefix: 'rate_limit_route',
		points: 5,
		duration: 60 * 60 * 3, // Store number for three hours since first fail
		blockDuration: 60 * 15, // Block for 15 minutes
	});


} else {
	const RateLimiterMemory = require("rate-limiter-flexible").RateLimiterMemory;
	limiter = new RateLimiterMemory({
		keyPrefix: 'rate_limit_route',
		points: 5,
		duration: 60 * 60 * 3, // Store number for three hours since first fail
		blockDuration: 60 * 15, // Block for 15 minutes
	});
}

exports.check = async(route, parameter) => {
	const rateLimitParameter = await limiter.get(route + "_" + parameter);

	if (rateLimitParameter !== null && rateLimitParameter.remainingPoints <= 0) {
		const retrySecs = Math.round(rateLimitParameter.msBeforeNext / 1000) || 1;
		return retrySecs;
	}

	return true;
};

exports.fail = async(route, parameter) => {
	await limiter.consume(route + "_" + parameter);
};

exports.clear = async(route, parameter) => {
	await limiter.delete(route + "_" + parameter);
};