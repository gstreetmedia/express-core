let _ = require("lodash");
const CacheableBase = require("../object/CacheableBase");

class ControllerBase extends CacheableBase{
	constructor(Model) {
		super();
		this._Model = Model;
	}

	/**
	 * @returns {ModelBase | class}
	 * @constructor
	 */
	get Model() {
		return this._Model;
	}

	/**
	 * @param {ModelBase} value
	 * @constructor
	 */
	set Model(value) {
		this._Model = value;
	}

	/**
	 * Create a new row in a model
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async create(req, res) {
		let m = new this.Model(req);
		let result = await m.create(req.body);
		if (res) {
			if (result && result.error) {
				return res.invalid(result);
			} else if (!result) {
				return res.error(
					{
						message : "Error on create",
						data : req.body,
						statusCode : 500
					}
				)
			}
			return res.created(result);
		} else {
			return result;
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
			let m = new this.Model(req);
			m.debug = req.query.debug === true;
			let result = await m.read(req.params.id, req.query, req.query.cache);
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
			let m = new this.Model(req);
			m.debug = req.query.debug === true;
			if (req.query && req.query.where) {
				result = await m.updateWhere(req.body, req.query);
			} else {
				//console.log("CB::update -> update");
				result = await m.update(req.params.id, req.body);
			}
			if (res) {
				if (result && result.error) {
					return res.invalid(result.error);
				} else if (!result) {
					return res.error(
						{
							message : "Missing Result in Update",
							input: req.body
						}
					);
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

		let m = new this.Model(req);
		m.debug = req.query.debug || false;
		let result = await m.updateWhere(req.query, req.body);
		if (res) {
			if (result.error) {
				return res.error(result.error);
			}
			return res.success(result);
		}
		return result;
	}

	/**
	 * Query for 1 to n rows based on input query
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async query(req, res) {

		let queryTest = this.testQuery(req, res);
		if (queryTest.error) {
			if (res) {
				return res.invalid(queryTest);
			} else {
				return queryTest
			}
		}

		let m = new this.Model(req);
		m.debug = req.query.debug === true;

		if (!process.env.CORE_MAX_QUERY_LIMIT || !req.roleManager.hasRole(process.env.CORE_MAX_QUERY_LIMIT.split(","))) {
			//If the user role (defined in CORE_MAX_QUERY_LIMIT) isn't allowed to request more than CORE_REQUEST_LIMIT
			req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : process.env.CORE_REQUEST_LIMIT || 500);
		}

		if (isNaN(req.query.limit)) {
			req.query.limit = process.env.CORE_REQUEST_LIMIT || 500;
		}

		req.query.offset = Math.min(req.query.offset ? parseInt(req.query.offset) : 0);
		if (isNaN(req.query.offset)) {
			req.query.offset = 0;
		}

		req.limit = req.query.limit;
		req.offset = req.query.offset;

		let result = await m.query(req.query, req.query.cache);

		if (Array.isArray(result) && (result.length === req.query.limit || req.query.offset > 0)) {
			req.count = await m.count(req.query, true);
		} else {
			req.count = result.length;
		}

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

		if (search.length < 3) {
			return res.success(
				{
					data : [],
					hash : {},
					query : query,
					sql : ""
				}
			)
		}

		let properties = req.query.properties || Object.keys(m.properties);

		if (!Array.isArray(properties)) {
			properties = properties.split(",");
		}

		properties.forEach(function(key){

			let properties = m.schema.properties;
			let rootKey = key.split(".")[0];

			if (!properties[key] && !properties[rootKey]) {
				delete properties[key];
				return;
			}

			let type = properties[rootKey].type;

			switch (type) {
				case "string" :
				case "object" :
					switch (properties[rootKey].format) {
						case "date" :
						case "date-time" :
							return;
						default :
					}
					query.where.or.push(
						{
							[key]: {"contains": search}
						}
					);
					query.select.push(key);
					break;
				case "number" :
					if (!isNaN(queryNumber)) {
						query.where.or.push(
							{
								[key]: {"startsWith": queryNumber}
							}
						);
					}
					query.select.push(key);
					break;
				case "array" :
					break;
			}
		});

		if (_.indexOf(query.select, m.primaryKey) === -1) {
			query.select.push(m.primaryKey);
		}

		let select = query.select = _.uniq(query.select);

		let results = await m.query(query);

		if (results.error) {
			results.q = query;
			return res.error(results.error);
		}

		let hash = {};

		results.forEach(
			function(item) {
				select.forEach((key)=> {
					let value;
					if (key.indexOf(".") !== -1 ) {
						value = _.get(item, key);
					} else {
						value = item[key];
					}

					if (value !== null) {
						let testValue = ("" + value).toLowerCase();
						if (testValue.indexOf(search) !== -1) {
							hash[key] = hash[key] || [];
							hash[key].push(value)
						}
					}
				})
			}
		);

		let list = [];

		for(let field in hash) {
			let values = _.uniq(hash[field]);
			values.forEach(
				function(item) {
					list.push(
						{
							value : "" + item,
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
				results : results
			}
		);

		//TODO limit search results to some for of a "name" field + the model.primaryKey
	}

	/**
	 * Remove an existing row
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroy(req, res) {
		let m = new this.Model(req);
		m.debug = req.query.debug || false;
		let result = await m.destroy(req.params.id);
		if (res) {
			if (result.error) {
				return res.error(result.error);
			}
			return res.success(result);
		}
		return result;
	}

	/**
	 * Remove rows, based on a query
	 * @param req
	 * @param res
	 * @returns {Promise<*>}
	 */
	async destroyWhere(req, res) {
		let m = new this.Model(req);
		m.debug = req.query.debug || false;
		let result = await m.destroyWhere(req.params.id);
		if (res) {
			if (result.error) {
				return res.error(result.error);
			}
			return res.success(result);
		}
		return result;
	}

	async adminIndex(req) {

		let m = new this.Model(req);
		await m.init();

		let foreignKeys = m.foreignKeys || {};
		let keys = Object.keys(foreignKeys);
		req.query.join = req.query.join || {};

		let fields = m.fields.adminIndex;

		while (keys.length > 0) {
			if (_.find(fields, {"visible": true, "property": keys[0]})) {
				req.query.join[keys[0]] = true;
			}
			keys.shift();
		}

		if (!process.env.CORE_MAX_QUERY_LIMIT || !req.roleManager.hasRole(process.env.CORE_MAX_QUERY_LIMIT.split(","))) {
			req.query.limit = Math.min(req.query.limit ? parseInt(req.query.limit) : 500);
		}
		if (isNaN(req.query.limit)) {
			req.query.limit = 500;
		}

		req.query.offset = Math.min(req.query.offset ? parseInt(req.query.offset) : 0);

		if (isNaN(req.query.offset)) {
			req.query.offset = 0;
		}

		req.limit = req.query.limit;
		req.offset = req.query.offset || 0;

		let result = await m.find(req.query);

		//Logic? Don't count unless we are paging through results
		if (Array.isArray(result) && (result.length === req.query.limit || req.query.offset > 0)) {
			req.count = await m.count(req.query, true);
		} else {
			req.count = result.length;
		}


		return result;
	}

	async adminCreate(req) {
		let m = new this.Model(req);
		await m.init();
		let foreignKeys = _.clone(m.foreignKeys);
		let keys = Object.keys(foreignKeys);
		let data = {
			lookup :{},
			search : {}
		};

		while (keys.length > 0) {

			let foreignKey = foreignKeys[keys[0]];
			console.log(keys[0]);
			console.log(foreignKey);
			let model = foreignKey.modelClass || foreignKey.model;
			let to = foreignKey.to;
			let FKM = m.loadModel(model);
			let fkm = new FKM(req);
			let count = await fkm.count();
			if (count < 25) {
				let items = await fkm.find(
					{
						select: [fkm.name || 'name', to, fkm.primaryKey],
						sort: fkm.name + " ASC",
						limit: 25
					}
				)
				let options = [];
				items.forEach(
					(item) => {
						if (item[to] && item[to] !== '') {
							options.push(
								{
									model : fkm.tableName,
									value: item[to],
									name: item[fkm.name]
								}
							)
						}
					}
				)
				data.lookup[keys[0]] = options;
			} else {
				data.search[keys[0]] = fkm.tableName;
			}
			keys.shift();
		}

		return data;
	}

	async adminUpdate(req) {
		let m = new this.Model();
		await m.init();
		let foreignKeys = _.clone(m.foreignKeys);
		let keys = Object.keys(foreignKeys);
		let data = await m.read(req.params.id);
		data.lookup = {};
		data.search = {};

		while (keys.length > 0) {
			let foreignKey = foreignKeys[keys[0]];
			let model = foreignKey.modelClass || foreignKey.model;
			let to = foreignKey.to;
			let FKM = m.loadModel(model);
			let fkm = new FKM();
			let count = await fkm.count();
			if (count < 25) {
				let items = await fkm.find(
					{
						select: [fkm.name || 'name', to, fkm.primaryKey],
						sort: fkm.name + " ASC",
						limit: 25
					}
				)

				let options = [];
				items.forEach(
					(item) => {
						if (item[to] && item[to] !== '') {
							options.push(
								{
									model : {
										schema : fkm.schema.object,
										tableName : fkm.tableName,
										fields : fkm.fields,
										relations: fkm.relations,
										foreignKeys : fkm.foreignKeys,
										primaryKey : fkm.primaryKey
									},
									value: item[to],
									name: item[fkm.name],
									[fkm.primaryKey] : item[fkm.primaryKey]
								}
							)
						}
					}
				)
				data.lookup[keys[0]] = options;
			} else {
				data.search[keys[0]] = fkm.tableName;
			}
			keys.shift();
		}

		return data;
	}

	async adminView(req) {
		let m = new this.Model();
		let result = await m.read(req.params.id, req.query);
		return result;
	}

	async adminDestroy(req) {
		let m = new this.Model(req);
		return await m.destroy(req.params.id);
	}


	testQuery(req, res) {
		let query = {};
		let data = {};

		if (req.body.query) {
			query = req.body.query;
		}

		if (req.body.data) {
			data = req.body.data;
		}

		if (req.body) {
			if (req.body.where) {
				query.where = req.body.where;
			}
			if (req.body.select) {
				query.select = req.body.select;
			}
			if (req.body.limit) {
				query.limit = req.body.limit;
			}
			if (req.body.offset) {
				query.offset = req.body.offset;
			}
			if (req.body.join) {
				query.join = req.body.join;
			}
			if (req.body.sort) {
				query.sort = req.body.sort;
			}
			if (req.body.debug) {
				query.debug = req.body.debug;
			}
			if (req.body.cache) {
				query.cache = req.body.cache;
			}
		}

		let queryParameters = [
			{"where":"object"},
			"join",
			"include",
			"select",
			"offset",
			"limit",
			"sort"]

		if (req.query && req.query.where && typeof req.query.where === "string") {
			try {
				let result = JSON.parse(req.query.where);
			} catch (e) {
				console.log(e);
				return {
					error : true,
					message : e.toString(),
					reason : "Malformed JSON Where"
				}
			}
			query.where = JSON.parse(req.query.where);
		}

		if (req.query && req.query.join && typeof req.query.join === "string") {
			if (req.query.join !== "*") {
				return req.query;
				try {
					let result = JSON.parse(req.query.join);
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

		if (req.query && req.query.offset && typeof req.query.offset === "string") {
			if (!isNaN(parseInt(req.query.offset))) {
				req.query.offset = parseInt(req.query.offset);
			}
		}

		if (req.query && req.query.limit && typeof req.query.limit === "string") {
			if (!isNaN(parseInt(req.query.limit))) {
				req.query.limit = parseInt(req.query.limit);
			}
		}

		if (req.query.query && typeof req.query.limit === "string") {
			try {
				req.query = JSON.parse(unescape(req.query.query));
			} catch (e) {
				return {
					error : true,
					message : e.toString(),
					reason : "Malformed ?query="
				}
			}
		}

		return req.query;
	}



}

module.exports = ControllerBase;
