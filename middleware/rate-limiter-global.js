let rateLimiterMiddleware;
let limiter;

if (process.env.CACHE_REDIS && !limiter) {

	const redis = require('redis');
	const {RateLimiterRedis: RateLimiterGlobal} = require('rate-limiter-flexible');
	const connectionStringParser = require("../helper/connection-string-parser");

	let connection = connectionStringParser(process.env.CACHE_REDIS);

	//console.log("Rate limiter Redis");
	//console.log(connection);

	const redisClient = redis.createClient({
		host: connection.host,
		port: connection.port,
		enable_offline_queue: false,
	});

	redisClient.on("error", (e) => {
		console.log("Could not connect to rate limiter global redis");
	});

	limiter = new RateLimiterGlobal({
		redis: redisClient,
		keyPrefix: 'rate_limit_global',
		points: 10, // 10 requests
		duration: 5, // per 1 second by IP
	});


} else if (!limiter) {
	const {RateLimiterMemory: RateLimiterMemory} = require('rate-limiter-flexible');

	limiter = new RateLimiterMemory({
		keyPrefix: 'rate_limit_global',
		points: 10, // 10 requests
		duration: 5, // per 1 second by IP
	});
}


rateLimiterMiddleware = async (req, res, next) => {
	try {
		await limiter.consume(req.ip);
		next();
	} catch(e) {
		res.status(429).send('Too Many Requests');
	}
};

module.exports = rateLimiterMiddleware;