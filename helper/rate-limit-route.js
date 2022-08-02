let limiter;
let md5 = require("md5");
let limiters = {};

/**
 *
 * @param requestCount
 * @param duration
 * @param blockDuration
 * @returns {{fail: fail, clear: clear, check: check}}
 */
let getLimiter = (requestCount, duration, blockDuration) => {
	if (process.env.CACHE_REDIS || process.env.CORE_CACHE_REDIS) {
		const redis = require('redis');
		const RateLimiterRedis = require('rate-limiter-flexible').RateLimiterRedis;

		const redisClient = redis.createClient({
			url: process.env.CORE_CACHE_REDIS || 'redis://127.0.0.0.1:6379',
			enable_offline_queue: false,
		});

		redisClient.on("error", (e) => {
			console.log("Rate Limiter Route Ready Error");
			console.log(e);
		});

		redisClient.on("ready", () => {
			console.log("Rate Limiter Route Ready > " + requestCount + " : " + duration + " : " + blockDuration);
		})

		limiter = new RateLimiterRedis({
			redis: redisClient,
			keyPrefix: 'rate_limit_route',
			points: requestCount,
			duration: duration, // Store number for three hours since first fail
			blockDuration: blockDuration, // Block for 15 minutes
		});


	} else {
		const RateLimiterMemory = require("rate-limiter-flexible").RateLimiterMemory;
		limiter = new RateLimiterMemory({
			keyPrefix: 'rate_limit_route',
			points: requestCount,
			duration: duration, // Store number for three hours since first fail
			blockDuration: blockDuration, // Block for 15 minutes
		});
	}

	return {
		/**
		 *
		 * @param routeKey
		 * @param duration
		 * @returns {Promise<null|number>}
		 */
		check : async(routeKey, duration) => {
			const rateLimitParameter = await limiter.get(routeKey);

			if (rateLimitParameter !== null && rateLimitParameter.remainingPoints <= 0) {
				const retrySecs = Math.round(rateLimitParameter.msBeforeNext / 1000) || 1;
				return retrySecs;
			}

			return null;
		},
		/**
		 *  Set a failure on this route
		 * @param route
		 * @returns {Promise<void>}
		 */
		fail : async(routeKey) => {
			await limiter.consume(routeKey);
		},
		/**
		 * Clear all points for this route
		 * @param route
		 * @returns {Promise<void>}
		 */
		clear : async(routeKey) => {
			await limiter.delete(routeKey);
		}
	}
}

/**
 *
 * @param requestCount
 * @param duration
 * @param blockDuration
 * @returns {{fail: fail, clear: clear, check: check}}
 */
module.exports = (requestCount, duration, blockDuration) => {
	requestCount = requestCount || 5;
	duration = duration || 1;
	blockDuration = blockDuration || 60;

	let key = md5(requestCount + duration + blockDuration)
	if (!limiters[duration]) {
		limiters[key] = getLimiter(requestCount, duration, blockDuration);
	}
	return limiters[key];
}
