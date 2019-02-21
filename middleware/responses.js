let now = require("../../core/helper/now");

module.exports = async function (req, res, next) {

	let startTime = new Date();
	//add more stuff you want

	res.success = (result)=>  {
		let now = new Date();
		let obj = {
			success:true,
			results:result,
			time : now.getTime() - startTime.getTime(),

		};
		if (req.limit) {
			obj.limit = req.limit;
		}
		if (req.offset >= 0) {
			obj.offset = req.offset;
		}
		if (req.count) {
			obj.count = req.count;
		}
		res.status(200).send(obj);
	};

	res.created = (e) => {
		if (e.statusCode) {

		} else {
			res.status(201).send(e);
		}
	};

	res.error = (e) => {
		if (e.statusCode) {

		} else {
			res.status(500).send(e);
		}
	};

	res.withStatus = (status, result)=> {
		let now = new Date();

		let obj = {
			success:status === 200 ? "success" : false,
			results:result,
			time : now.getTime() - startTime.getTime(),

		};

		res.status(status).send(obj);
	}

	res.notFound = (e)=> {
		res.status(404).send(e);
	};

	res.notAllowed = (e)=> {
		res.status(401).send({error:true,message:"Missing/Invalid Credentials"});
	};

	res.invalid = (message)=> {
		console.log(message);
		if (typeof  message === "object") {
			return res.status(400).send(message)
		}
		res.status(400).send({error:true,message:message});
	};

	next();
}