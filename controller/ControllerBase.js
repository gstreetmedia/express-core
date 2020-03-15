let jsonlint = require("jsonlint");
let validateAgainstSchema = require("../helper/validate-against-schema");
let _ = require("lodash");
let cache = require("../helper/cache-manager");

class ControllerBase {
	constructor(Model) {
		this.Model = Model;
		this.cache = cache;
	}

	/**
	 * Get a list of a model, typically of id's
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async index(req, res) {
		//console.log("ControllerBase::index");

		let queryTest = this.testQuery(req, res);
		if (queryTest.error) {
			if (res) {
				return res.invalid(queryTest);
			} else {
				return queryTest
			}
		}

		try {
			let m = new this.Model(req);
			let count = await m.count(req.query);
			req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 500);
			if (isNaN(req.query.limit)) {
				req.query.limit = 500;
			}
			req.query.offset = Math.min(req.query.offset ? parseInt(req.query.offset) : 0);
			if (isNaN(req.query.offset)) {
				req.query.offset = 0;
			}
			req.limit = req.query.limit;
			req.offset = req.query.offset || 0;
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
				return res.created(result);
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
		//console.log("ControllerBase:read");

		let queryTest = this.testQuery(req, res);

		if (queryTest && queryTest.error) {
			if (res) {
				return res.invalid(queryTest);
			} else {
				return queryTest
			}
		}

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

		try {
			let result;
			if (req.query && req.query.where) {
				let result = await new this.Model(req).updateWhere(req.body, req.query);
			} else {
				result = await new this.Model(req).update(req.params.id, req.body);
			}
			if (result) {
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

		let queryTest = this.testQuery(req, res);
		if (queryTest.error) {
			if (res) {
				return res.invalid(queryTest);
			} else {
				return queryTest
			}
		}

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

		//console.log("ControllerBase::query");
		let queryTest = this.testQuery(req, res);
		if (queryTest.error) {
			if (res) {
				return res.invalid(queryTest);
			} else {
				return queryTest
			}
		}

		let m = new this.Model(req);
		let count = await m.count(req.query);

		req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 500);
		if (isNaN(req.query.limit)) {
			req.query.limit = 500;
		}
		req.query.offset = Math.min(req.query.offset ? parseInt(req.query.offset) : 0);
		if (isNaN(req.query.offset)) {
			req.query.offset = 0;
		}

		req.limit = req.query.limit;
		req.offset = req.query.offset || 0;
		req.count = parseInt(count);

		let result = await m.query(req.query);

		//console.log(m.lastCommand.toString());

		if (res) {
			if (result.error) {
				return res.error(result);
			}
			return res.success(result);
		} else {
			return result;
		}
	}

	/**
	 *
	 * @param req
	 * @param res
	 * @returns {Promise<void>}
	 */
	async search(req, res) {

		let m = new this.Model(req);

		let query = {
			where : {
				or : [

				]
			},
			select : []
		};


		let search = req.query.query.toString().toLowerCase();
		let queryNumber = parseFloat(search);

		let properties = req.query.properties || Object.keys(m.properties);

		if (!_.isArray(properties)) {
			properties = properties.split(",");
		}

		properties.forEach(function(key){
			let properties = m.schema.properties;
			if (!properties[key]) {
				return;
			}
			if (properties[key].type === "string") {
				let validate = true;

				if (properties[key].enum) {
					validate = false;
				}

				switch (properties[key].format) {
					case "date" :
					case "date-time" :
						return;
					case "uuid" :
						//continue;
						//break;
					//it's okay, we
					default :
				}


				query.where.or.push(
					{
						[key]: {"contains": search}
					}

				);
				query.select.push(key);

				if (!validate || validateAgainstSchema(key, {[key]:search}, m.schema)) {

				}
			} else if (properties[key].type === "number" && !isNaN(queryNumber)) {
				query.where.or.push(
					{
						[key]: {"startsWith": queryNumber}
					}
				);
				query.select.push(key);
			}
		});

		//console.log(query);


		if (_.indexOf(query.select, m.primaryKey) === -1) {
			query.select.push(m.primaryKey);
		}

		let results = await m.query(query);

		//console.log(m.lastCommand.toString());

		if (results.error) {
			results.q = query;
			return res.error(results.error);
		}

		let hash = {};

		results.forEach(
			function(item) {
				for(let field in item) {
					if (item[field]) {
						if (!item[field]) {
							return;
						}
						let testValue = ("" + item[field]).toLowerCase();
						if (testValue.indexOf(search) !== -1) {
							hash[field] = hash[field] || [];
							hash[field].push(item[field])
						}
					}
				}
			}
		);

		let list = [];

		for(let field in hash) {
			let values = _.uniq(hash[field]);
			values.forEach(
				function(item) {
					list.push(
						{
							value : item,
							field : field
						}
					)
				}
			)
		}


		return res.success(
			{
				data : list,
				hash : hash,
				query : query,
				sql : m.lastCommand.toString()
			}
		);

		//TODO limit search results to some for of a "name" field + the model.primaryKey
	}

	/**
	 * Remove and existing row
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroy(req, res) {
		console.log("ControllerBase::destroy");
		try {
			let result = await new this.Model(req).destroy(req.params.id);
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

	async adminIndex(req) {
		let m = new this.Model(req);
		let keys = Object.keys(m.foreignKeys);
		req.query.join = req.query.join || {};

		let fields = m.fields.adminIndex;

		while (keys.length > 0) {
			if (_.find(fields, {"visible": true, "property": keys[0]})) {
				req.query.join[keys[0]] = true;
			}
			keys.shift();
		}

		let count = await m.count(req.query);

		req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 500);
		if (isNaN(req.query.limit)) {
			req.query.limit = 500;
		}

		req.query.offset = Math.min(req.query.offset ? parseInt(req.query.offset) : 0);

		if (isNaN(req.query.offset)) {
			req.query.offset = 0;
		}

		req.limit = req.query.limit;
		req.offset = req.query.offset || 0;
		req.count = parseInt(count);

		let result = await m.find(req.query);

		return result;
	}

	async adminCreate(req) {
		let m = new this.Model(req);
		let foreignKeys = _.clone(m.foreignKeys);
		let keys = Object.keys(foreignKeys);
		let data = {
			lookup :{},
			search : {}
		};

		while (keys.length > 0) {
			let path = global.appRoot + "/src/model/" + foreignKeys[keys[0]].modelClass;
			let M = require(path);
			let m = new M(req);
			let count = await m.count();
			if (count < 25) {
				data.lookup[keys[0]] = await m.find({select:['id','name'],sort:"name ASC", limit:25});
			} else {
				data.search[keys[0]] = m.tableName;
			}
			keys.shift();
		}

		return data;
	}

	async adminUpdate(req) {
		let m = new this.Model(req);
		let foreignKeys = _.clone(m.foreignKeys);
		let keys = Object.keys(foreignKeys);
		let data = await m.read(req.params.id);

		data.lookup = {};
		data.search = {};

		while (keys.length > 0) {
			let path = global.appRoot + "/src/model/" + foreignKeys[keys[0]].modelClass;
			let M = require(path);
			let m = new M(req);
			let count = await m.count();
			if (count < 25) {
				data.lookup[keys[0]] = await m.find({select:['id','name'],sort:"name ASC", limit:25});
			} else {
				data.search[keys[0]] = m.tableName;
			}
			keys.shift();
		}

		return data;
	}

	async adminView(req) {
		let m = new this.Model(req);
		return await m.read(req.params.id, req.query);
	}

	async adminDestroy(req) {
		let m = new this.Model(req);
		return await m.destroy(req.params.id);
	}


	testQuery(req, res) {

		if (req.body) {
			if (req.body.where) {
				req.query.where = req.body.where;
			}
			if (req.body.select) {
				req.query.select = req.body.select;
			}
			if (req.body.limit) {
				req.query.limit = req.body.limit;
			}
			if (req.body.offset) {
				req.query.offset = req.body.offset;
			}
			if (req.body.join) {
				req.query.join = req.body.join;
			}
			if (req.body.sort) {
				req.query.sort = req.body.sort;
			}
		}

		if (req.query && req.query.where && typeof req.query.where === "string") {
			try {
				let result = jsonlint.parse(req.query.where);
			} catch (e) {
				console.log(e);
				return {
					error : true,
					message : e.toString(),
					reason : "Malformed JSON Where"
				}
			}
			req.query.where = JSON.parse(req.query.where);
		}

		if (req.query && req.query.join && typeof req.query.join === "string") {
			if (req.query.join !== "*") {
				return req.query;
				try {
					let result = jsonlint.parse(req.query.join);
				} catch (e) {

					return {
						error : true,
						message : e.toString(),
						reason : "Malformed JSON Join"
					}
				}
				req.query.join = JSON.parse(req.query.join);
			}
		}

		if (req.query && req.query.select && typeof req.query.select === "string") {

			if (req.query.select === "*") {  //select all
				return req.query;
			}
			if (req.query.select.indexOf("[") === 0) { //json style = ["field1","field2","field3"]
				try {
					let result = jsonlint.parse(req.query.select);
					req.query.select = JSON.parse(req.query.select);
				} catch (e) {

					return {
						error : true,
						message : e.toString(),
						reason : "Malformed JSON Select"
					}
				}
			} else {
				req.query.select = req.query.select.split(",");  //comma sepparated field1,field2,field3
			}
		}

		return req.query;
	}

}

module.exports = ControllerBase;