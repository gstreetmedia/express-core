module.exports = async function (req, res, next) {

	let startTime = new Date();
	//add more stuff you want

	res.success = function(result) {
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

	res.error = function(e) {
		res.status(500).send(e);
	};

	res.error = function(e) {
		res.status(500).send(e);
	};

	res.notFound = function(e) {
		res.status(404).send(e);
	};

	res.notAllowed = function(e) {
		res.status(401).send({error:true,message:"Missing/Invalid Credentials"});
	};

	res.invalid = function(message) {
		if (typeof  message === "object") {
			return res.status(400).send(message)
		}
		res.status(400).send({error:true,message:message});
	};

	next();
}