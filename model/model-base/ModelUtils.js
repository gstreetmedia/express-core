const _ = require("lodash");
const processType = require("../../helper/process-type");
const uuid = require("node-uuid");

class ModelUtils {

	/**
	 * @param {ModelBase} model
	 * @param {string | int | array} id
	 * @param query
	 * @returns {{error: {message: string, statusCode: number}}}
	 */
	static addPrimaryKeyToQuery(model, id, query) {
		let primaryKey = model.primaryKey;
		query.where = query.where || {};
		if (Array.isArray(primaryKey)) {
			if (typeof id === "string") {
				if (id.indexOf(",") !== -1) {
					id = id.split(",");
				} else {
					id = [id];
				}
			} else if (typeof id === "number") {
				id = [id];
			}
			if (id.length !== primaryKey.length) {
				return {
					error : {
						message : "Missing parts for primary key. Got " + id.length + " expected " + model.primaryKey.length,
						statusCode : 500
					}
				}
			}
			while(primaryKey.length > 0) {
				let key = primaryKey[0];
				query.where[key] = id[0];
				id.shift();
			}
		} else {
			query.where[primaryKey] = id;
		}
	}

	/**
	 * If the primary key is a UUID and missing, create one
	 * @param {ModelBase} model
	 * @param data
	 */
	static checkPrimaryKey(model, data) {
		let primaryKey = model.primaryKey;
		if (!Array.isArray(primaryKey)) {
			primaryKey = [primaryKey];
		}
		//console.log(primaryKey);
		let keyLength = 0;
		primaryKey.forEach(
			(key) => {
				//console.log(key + " -> " + data[key]);
				if (!data[key]) {
					switch (model.properties[key].type) {
						case "string" :
							switch (model.properties[key].format) {
								case "uuid" :
									data[key] = uuid.v4();
									keyLength++;
									break;
								default	:
									console.error("Please define a format for the primaryKey");
							}
							break;
						case "number" :
							if (!model.properties[key].autoIncrement) {
								//TODO shouldn't we get the next
								keyLength++;
							}
					}
				} else {
					keyLength++
				}
			}
		)
		if (keyLength !== primaryKey.length) {
			console.error("Primary key missing from data -> " + model.tableName + " -> " + keyLength + " vs " + primaryKey.length);
			//console.log(data);
		}
	}

	/**
	 * Make sure all the required keys of a join are present in the select.
	 * @param {ModelBase} model
	 * @param originalQuery
	 * @param targetQuery
	 */
	static async addJoinFromKeys(model, originalQuery, targetQuery) {
		//model.log("ModelUtils::addJoinFromKeys", model.tableName);
		if (!originalQuery) {
			//probably a simple read
			//model.log("ModelUtils::addJoinFromKeys", "no query");
			return;
		}
		if (originalQuery.join) {
			//implies the request isn't doing a join
			//model.log("ModelUtils::addJoinFromKeys", "has join");
		} else {
			//model.log("ModelUtils::addJoinFromKeys", "no join");
			return;
		}
		if (Array.isArray(originalQuery.select)) {
			//implies no special select
			//model.log("ModelUtils::addJoinFromKeys", "has select");
		} else {
			//model.log("ModelUtils::addJoinFromKeys", "no select");
			return;
		}
		let relations = await model.getRelations();
		let foreignKeys = await model.getForeignKeys();
		if (model.relations) {
			//model doesn't have any relations, not matter the query
			//model.log("ModelUtils::addJoinFromKeys", "has relations");
		} else {
			//model.log("ModelUtils::addJoinFromKeys", "no relations");

		}

		let keys;
		let select = originalQuery.select;
		let required = [];
		if (originalQuery.join === "*") {
			keys = Object.keys(model.relations);
		} else {
			keys = Object.keys(originalQuery.join);
		}
		//model.log("ModelUtils::addJoinFromKeys join", keys);
		if (relations) {
			keys.forEach(
				(k) => {
					if (!relations[k]) {
						return;
					}
					if (relations[k].join.hasOwnProperty("from")) {
						if (Array.isArray(relations[k].join.from)) {
							required = required.concat(relations[k].join.from)
						} else {
							required.push(relations[k].join.from);
						}
					}
					if (relations[k].join.hasOwnProperty("through")) {
						if (Array.isArray(relations[k].join.through.from)) {
							required = required.concat(relations[k].join.through.from)
						} else {
							required.push(relations[k].join.through.from);
						}
					}
					if (relations[k].where) {
						Object.keys(relations[k].where).forEach(
							(ik) => {
								if (ik !== "or" && ik !== "and") {
									required.push(ik);
								} else {
									relations[k].where[ik].forEach(
										(o) => {
											required.push(Object.keys(o)[0])
										}
									)
								}
							}
						)
					}
				}
			)
		}
		if (foreignKeys) {
			if (originalQuery.join === "*") {
				keys = Object.keys(this.foreignKeys);
			} else {
				keys = Object.keys(originalQuery.join);
			}
			keys.forEach(
				(k) => {
					if (!model.foreignKeys[k]) {
						return;
					}
					if (Array.isArray(model.foreignKeys[k].from)) {
						required = required.concat(foreignKeys[k].from)
					} else {
						required.push(model.foreignKeys[k].from);
					}
				}
			)
		}

		//model.log("ModelUtils::addJoinFromKeys required", _.uniq(required));
		targetQuery.select = _.uniq(select.concat(required));

	}

	/**
	 * returns a list of visible properties in a fieldset or all properties from the schema
	 * @param {ModelBase} model
	 * @param fieldset
	 * @returns {[]}
	 */
	static getSelect(model, fieldset) {
		return fieldset ? _.map(_.filter(model.fields[fieldset],{"visible":true}),"property") : model.schema.keys;
	}

	/**
	 * Convert underscores back to camel case. Most of this would have happened in the creation of the SQL query,
	 * however if you appended anything raw to the end, those might not yet have been converted
	 * @param {ModelBase} model
	 * @param result
	 * @returns {*}
	 */
	static postProcessResponse(model, result) {
		let isArray = Array.isArray(result);
		if (!isArray) {
			result = [result];
		}
		// TODO: add special case for raw results (depends on dialect)
		result.forEach(
			function (row) {
				for (let key in row) {
					if (key.indexOf("_") !== -1) {

					}
					if (key.indexOf(".") !== -1) {
						let parts = key.split(".");
						let doDeep = (pieces, obj) => {
							obj = obj || {};
							if (pieces.length === 0) {
								return obj;
							}
							obj[pieces[0]] = obj[pieces[0]] || {};
							return doDeep(pieces.shift(), obj);
						}
						let columnName = parts[0];
						parts.shift();
						row[columnName] = row[columnName] || {};
						let target = doDeep(parts, row[columnName]);
						target = row[key];
					} else {
						let newKey = model.schema.dbColumnToSchemaProperty(key);
						if (newKey !== key) {
							row[newKey] = row[key];
							delete row[key];
						}
					}
				}
			}
		)
		return isArray ? result : result[0];
	}

	/**
	 * Takes database result and converts it back to schema properties
	 * Use this when doing manual sql statements
	 * @param {ModelBase} model
	 * @param results
	 */
	static convertResultsToSchema(model, results) {
		for (let i = 0; i < results.length; i++) {
			for (let key in results[i]) {
				for (let innerKey in model.properties) {
					if (model.properties[innerKey].columnName === key) {
						results[i][innerKey] = results[i][key];
						delete results[i][key];
					}
				}
			}
		}
	}

	/**
	 * Run through the data, compare against the schema, and make sure we have all the props with need
	 * @param {ModelBase} model
	 * @param data
	 * @param action
	 * @returns {Promise<*>}
	 */
	static async checkRequiredProperties(model, data, action) {
		await model.getSchema();
		if (action === "create") {
			let keys = [];

			for (let key in data) {
				if (!data[key] && model.properties[key].default) {
					if (model.properties[key].default === "now") {
						data[key] = now();
					} else {
						data[key] = model.properties[key].default;
					}
					keys.push(key);
				} else if (data[key]) {
					keys.push(key);
				}
			}

			let intersection = _.intersection(model.schema.required, keys); //keys found in input and required

			if (intersection.length < model.schema.required.length) {  //if the intersection is less than required, something is missing
				//these will be the values that are missing.
				let missing = _.difference(intersection, model.schema.required);
				if (missing.length > 0) {
					return missing
				} else {
					return true;
				}
			}

			return true;
		} else {
			let missing = [];
			for (let key in data) {
				if (data[key] === null && _.indexOf(model.schema.required, key) !== -1) {
					missing.push(key);
				}
			}
			if (missing.length > 0) {
				return missing;
			} else {
				return true;
			}
		}
	}

	static convertToColumnNames(model, data) {
		let params = {};
		for (let key in data) {
			if (model.properties[key]) {
				params[model.properties[key].columnName] = data[key];
			}
		}

		return params;
	}

	/**
	 * Converts any input types to the correct one (eg. string to int) and convert objects to JSON
	 * @param {ModelBase} model
	 * @param data
	 * @returns {Promise<void>}
	 */
	static async convertDataTypes(model, data) {
		await model.getSchema();
		let params = {};
		for (let key in data) {
			if (model.properties[key]) {
				params[key] = processType(data[key], model.properties[key]);
			} else {
				//console.log("unknown key " + key);
			}
		}
		return params;
	}

	/**
	 * Converts things like "foo.bar" into {foo: {bar : "value}}
	 * @param model
	 * @param results
	 * @returns {*}
	 */
	static convertDotFieldsToObjects(model, results) {
		if (!results || !Array.isArray(results) || results.length === 0) {
			return results;
		}

		let keys = Object.keys(results[0]);
		if (keys.join("_").indexOf(".") === -1) {
			return results;
		}
		let hash = {};
		let hasElements;
		keys.forEach(
			(key) => {
				if (key.indexOf(".") !== -1) {
					let parts = key.split(".");
					if (model.properties[parts[0]]) {
						parts.shift();
						hasElements = true;
						hash[key] = true;
					}
				}
			}
		);

		let doDeep = (parts, obj, value) => {
			let innerKey = parts[0];
			if (parts.length > 1) {
				obj[innerKey] = obj[innerKey] || {};
				parts.shift();
				return doDeep(parts, obj[innerKey], value);
			} else {
				obj[parts[0]] = value;
			}
		}

		let dotKeys = Object.keys(hash);

		if (hasElements) {
			results.forEach(
				function (row) {
					dotKeys.forEach(
						(key) => {
							if (row.hasOwnProperty(key)) {
								let value = row[key];
								if (_.isString(value) && (value.indexOf("{") === 0 || value.indexOf("[") === 0)) {
									try {
										value = JSON.parse(row[key]);
									} catch (e) {
										//Not JSON.
									}
								}
								let parts = key.split(".");
								row[parts[0]] = row[parts[0]] || {};
								let o = row[parts[0]];
								parts.shift();
								doDeep(parts, o, value);
								delete row[key];
							}
						}
					)
					if (row.id && row.record) {
						row.record.id = row.id; //TODO this should be done during insert
					}
				}
			);
		}

		return results;

	}

	static trimObject(obj) {
		if (_.isString(obj)) {
			return obj.trim();
		} else if (Array.isArray(obj)) {
			for (let i = 0; i < obj.length; i++) {
				try {
					obj[i] = trim(obj[i]);
				} catch (e) {
					console.log(e);
				}
			}
		} else if (_.isObject(obj)) {
			for (let key in obj) {
				try {
					obj[key] = trim(obj[key]);
				} catch (e) {
					console.log(e);
				}
			}
		}

		return obj;
	}
}

module.exports = ModelUtils;
