let beautify = require("json-beautify");
module.exports = async(method, message) => {
	if (!process.env.AWS_REGION ||
		!process.env.SNS_ALERT_NOTIFICATION_ARN ||
		!process.env.AWS_ACCESS_KEY_ID ||
		!process.env.AWS_SECRET_ACCESS_KEY ||
		process.env.CORE_AWS_ENABLED !== "true") {
		console.log("AWS SNS Disabled");
		return;
	}
	try {
		const AWS = require('aws-sdk');
		AWS.config.update({region: process.env.AWS_REGION});
		let payload = beautify(
			{
				method: method,
				message : message
			},
			null, 2, 80
		);

		let params = {
			Message: payload,
			TopicArn: process.env.SNS_ALERT_NOTIFICATION_ARN
		};

		new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise().then((result) => {
			console.log(result);
		}).catch((e) => {
			console.log(e);
		})
	} catch (error) {
		console.log(error);
	}
}
