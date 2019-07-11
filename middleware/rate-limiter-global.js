const redis = require('redis');
const {RateLimiterRedis: RateLimiterGlobal} = require('rate-limiter-flexible');
const connectionStringParser = require("../helper/connection-string-parser");
let rateLimiterMiddleware;

if (process.env.CACHE_REDIS) {

	let connection = connectionStringParser(process.env.CACHE_REDIS);

	console.log(connection);

	const redisClient = redis.createClient({
		url : process.env.CACHE_REDIS,
		enable_offline_queue: false,
	});

	redisClient.on('error', function (err) {
		console.log("Could not connect ratelimiter redis");
	});

	const rateLimiter = new RateLimiterGlobal({
		redis: redisClient,
		keyPrefix: 'middleware',
		points: 10, // 10 requests
		duration: 5, // per 1 second by IP
	});

	rateLimiterMiddleware = async (req, res, next) => {
		try {
			await rateLimiter.consume(req.ip);
			next();
		} catch(e) {
			res.status(429).send('Too Many Requests');
		}
	};

} else {
	rateLimiterMiddleware = async (req, res, next) => {
		next();
	}
}

module.exports = rateLimiterMiddleware;