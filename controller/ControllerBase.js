module.exports = class ControllerBase {
	constructor(Model) {
		this.Model = Model;
	}

	/**
	 * Get a list of a model, typically of id's
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async index(req, res) {
		console.log("ControllerBase::index");
		try {
			let m = new this.Model(req);
			let count = await m.count(req.query);


			if (count > 500) {
				req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 500);
				req.query.offset = req.query.offset ? parseInt(req.query.offset) : 0;
				req.limit = req.query.limit;
				req.offset = req.query.offset;
			}

			req.count = parseInt(count);
			let result = await m.index(req.query);
			if (res) {
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			console.log(e);
			if (res) {
				return res.invalid(e);
			} else {
				return null;
			}
		}
	}

	/**
	 * Create a new row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async create(req, res) {
		try {
			let result = await new this.Model(req).create(req.body);
			if (res) {
				if (result.error) {
					return res.invalid(result);
				}
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			console.log(e);
			if (res) {
				return res.invalid(e);
			} else {
				return false;
			}
		}
	}

	/**
	 * Read an existing row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async read(req, res) {
		console.log("ControllerBase:read");
		try {
			let result = await new this.Model(req).read(req.params.id, req.query);
			if (res) {
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			console.log(e);
			if (res) {
				return res.invalid(e);
			} else {
				return null;
			}
		}
	}

	/**
	 * Update / Replace an existing row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async update(req, res) {
		console.log("ControllerBase:update");
		try {
			let result;
			if (req.query.where) {
				let result = await new this.Model(req).updateWhere(req.body, req.query);
			} else {
				result = await new this.Model(req).update(req.params.id, req.body);
			}
			if (res) {
				if (result.error) {
					return res.invalid(result);
				}
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			console.log(e);
			if (res) {
				return res.invalid(e);
			} else {
				return false;
			}
		}
	}

	/**
	 * Update a number of rows that match some criteria
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async updateWhere(req, res) {
		try {
			let result = await new this.Model(req).updateWhere(req.params.query, req.body);
			if (res) {
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			if (res) {
				return res.invalid(e);
			} else {
				return false;
			}
		}
	}

	/**
	 * Query for 1 to n rows based on input query
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async query(req, res) {
		try {
			let m = new this.Model(req);
			let count = await m.count(req.query);
			if (count > 500) {
				req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 500);
				req.query.offset = req.query.offset ? parseInt(req.query.offset) : 0;
				req.limit = req.query.limit;
				req.offset = req.query.offset;
			}
			req.count = parseInt(count);
			let result = await m.query(req.query);
			if (res) {
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			console.log(e);
			if (res) {
				return res.invalid(e);
			} else {
				return false;
			}
		}
	}

	/**
	 * Remove and existing row
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroy(req, res) {
		try {
			let result = await new this.Model(req).destroy(req.params.id);
			if (res) {
				return res.success(result);
			} else {
				return result;
			}
		} catch (e) {
			if (res) {
				return res.invalid(e);
			} else {
				return false;
			}
		}
	}



}