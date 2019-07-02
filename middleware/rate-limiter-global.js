const redis = require('redis');
const {RateLimiterRedis: RateLimiterGlobal} = require('rate-limiter-flexible');
const connectionStringParser = require("../helper/connection-string-parser");

let connection = connectionStringParser(process.env.CACHE_REDIS);

console.log(connection);

const redisClient = redis.createClient({
	host: connection.host,
	port: connection.port,
	enable_offline_queue: false,
});

const rateLimiter = new RateLimiterGlobal({
	redis: redisClient,
	keyPrefix: 'middleware',
	points: 10, // 10 requests
	duration: 5, // per 1 second by IP
});

const rateLimiterMiddleware = async (req, res, next) => {
	try {
		await rateLimiter.consume(req.ip);
		next();
	} catch(e) {
		res.status(429).send('Too Many Requests');
	}
};

module.exports = rateLimiterMiddleware;