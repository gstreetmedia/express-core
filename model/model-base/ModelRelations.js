"use strict";
const _ = require("lodash");
const util = require("util")
const getModel = require("../../helper/get-model");

class ModelRelations {
	static loadModel(modelName) {
		if (typeof modelName !== "string") {
			return modelName;
		}

		let model = getModel(modelName);
		if (!model) {
			console.error("ModelRelations::loadModel Model DNE " + modelName);
		}
		return model;
	}

	/**
	 * Add any selects defined in the relation
	 * @param {object} model
	 * @param {string} key
	 * @param {object} j
	 */
	static async processSelect(model, key, j) {
		let relations = await model.getRelations();
		if (!relations) {
			return;
		}
		if (!relations[key]) {
			//model.log("processSelect", "no relation for " + key);
			//model.log("processSelect relations->", relations);
		}
		if (relations[key] && relations[key].select) {
			j.select = j.select || [];
			relations[key].select.forEach(
				(field) => {
					j.select.push(field)
				}
			);
			j.select = _.uniq(j.select);
		}
	}

	static relationType(type) {
		switch (type.toLowerCase()) {
			case "hasone":
			case "has-one":
			case "one":
				type = "has-one";
				break;
			case "hasmany" :
			case "has-many" :
			case "many" :
				type = "has-many";
		}
		return type;
	}

	/**
	 * Pluck a value out of an object. check for dot syntax
	 * @param object
	 * @param key
	 * @returns {*}
	 */
	static getValue(object, key) {
		if (Array.isArray(key)) {
			let value = [];
			key.forEach(
				(item) => {
					if (item.indexOf(".") !== -1) {
						value.push( _.get(object, item));
					} else {
						value.push(object[item])
					}
				}
			)
			return value.join(" ");
		}
		if (key.indexOf(".") !== -1) {
			return _.get(object, key);
		}
		return object[key];
	}

	/**
	 * If a select was present remove extra keys from join
	 * @param results
	 * @param key
	 * @param originalSelect
	 */
	static processExtras(results, key, originalSelect) {
		if (results &&
			results.length > 0 &&
			results[0][key] &&
			originalSelect &&
			originalSelect.length > 0) {
			let keys = Object.keys(results[0][key]);
			for (let i = 0; i < results.length; i++) {
				keys.forEach((field) => {
						if (originalSelect.indexOf(field) === -1) {
							delete results[i][key][field];
						}
					}
				);
			}
		}
	};

	static addWhereTo(j, index) {
		let keys = Object.keys(index[0].to);
		index.forEach(
			(row) => {
				keys.forEach(
					(field, index) => {
						j.where[field] = j.where[field] || {in: []};
						if (Array.isArray(row.to[field])) {
							j.where[field].in = j.where[field].in.concat(row.to[field]);
						} else {
							j.where[field].in.push(row.to[field]);
						}
						j.where[field].in = _.uniq(j.where[field].in);
					}
				)
			}
		)
	}

	static async include(model, results, query) {

		let relations = await model.getRelations();
		let foreignKeys = await model.getForeignKeys();

		if (!relations && !foreignKeys) {
			model.log("join", "no relations or foreignKeys for " + model.tableName);
			return results;
		}

		let findOne = false;

		if (!Array.isArray(results)) {
			results = [results];
			findOne = true;
		}

		let join = _.clone(query.join || query.include);
		let fullJoin = false;

		if (join === "*") {
			fullJoin = true;
			join = Object.keys(relations);
			join = join.concat(Object.keys(foreignKeys));
		}

		if (_.isString(join)) {
			let items = join.split(",");
			join = {};
			items.forEach(
				function (item) {
					join[item] = {
						where: {}
					};
				}
			)
		} else if (Array.isArray(join)) {
			let temp = {};
			join.forEach(
				function (item) {
					temp[item] = {
						where: {}
					}
				}
			);
			join = temp;
		} else if (_.isObject(join)) {
			//console.log("JOIN IS AN OBJECT");
			//not sure is there is anything to do here
			//console.log("Condition 3");
		}

		let keys = Object.keys(join);

		if (model.req) {
			model.req.locals.currentResults = results;
		}

		while (keys.length > 0) {
			let startTime = new Date().getTime();
			let key = keys[0];
			if (!relations[key] && !foreignKeys[key]) {
				model.log("ModelRelations::join", "Unknown relation " + key + " in " + model.tableName);
				keys.shift();
				continue;
			}
			if (relations[key]) {
				let j = join[key] === true ? {} : join[key];
				if (j === false) {
					keys.shift();
					continue;
				}
				await ModelRelations.doRelation(model, results, relations, key, j);
			} else if (foreignKeys[key]) {
				await ModelRelations.doForeignKey(model, results, foreignKeys, key);
			}
			keys.shift();
		}

		if (findOne) {
			return results[0];
		}

		return results;
	}

	/**
	 *
	 * @param {ModelBase} model
	 * @param {array} join
	 * @returns {boolean}
	 */
	static validJoinKeys(model, join) {
		let joinKeys = _.clone(join);
		let inValidKeys = [];
		let validKeys = [];
		let keys = model.schema.keys;
		while(joinKeys.length > 0) {
			let key = joinKeys[0];
			let originalKey;
			if (key.indexOf(".") !== -1) {
				//foo.bar
				originalKey = key;
				key = key.split(".")[0];
			}
			if (!keys.includes(key)) {
				inValidKeys.push(originalKey || key);
			} else {
				validKeys.push(originalKey || key);
			}
			joinKeys.shift();
		}
		return validKeys.length === join.length ? true : inValidKeys;
	}

	/**
	 * @param {ModelBase} model
	 * @param {array} results
	 * @param {object} relations
	 * @param {string} key
	 * @param {object} join
	 * @returns {Promise<void>}
	 */
	static async doRelation(model, results, relations, key, join) {
		model.log("doRelation", key);
		let startTime = new Date().getTime();
		let relation = _.clone(relations[key]);
		if (relation.allowedRoles && (model.req && !model.req.hasRole(relation.allowedRoles))) {
			return;
		}
		let list;
		let throughList;
		let relationType = ModelRelations.relationType(relation.relation || relation.type);
		let originalSelect = relation.join.select ? _.clone(relation.join.select) : null;
		let joinFrom = relation.join.from;
		let joinTo = relation.join.to;
		let joinThroughFrom = relation.join.through ? relation.join.through.from : null;
		let joinThroughTo = relation.join.through ? relation.join.through.to : null;
		let joinThroughWhere = relation.join.through ? relation.join.through.where : null;
		let joinThroughSort = relation.join.through ? relation.join.through.sort : null;
		let removeJoinTo = false; //keys not requested

		const RelationModel = this.loadModel(relation.model || relation.modelClass);
		if (!RelationModel) {
			console.error("No model " + relation.model + " exists");
			return;
		}

		let ThroughModel;
		let throughModel;
		if (relation.throughModel || relation.throughClass) {
			ThroughModel = this.loadModel(relation.throughModel || relation.throughClass);
			if (!ThroughModel) {
				console.error("No model " + relation.throughModel + " exists");
				return;
			}
			throughModel = new ThroughModel(model.req);
			await throughModel.init();
		}

		let relationModel = new RelationModel(model.req);
		await relationModel.init();

		let isValid = true;
		if (joinFrom) {
			if (!Array.isArray(joinFrom)) {
				joinFrom = [joinFrom];
			}
			let keyCheck = ModelRelations.validJoinKeys(model, joinFrom);
			if (keyCheck !== true) {
				model.log("join->"+key, "invalid 'from' keys => " + keyCheck, null, "error", true);
				isValid = false;
			}
		} else {
			model.log("join->"+key, "missing from", null, "error", true);
			isValid = false;
		}

		if (joinTo) {
			if (!Array.isArray(joinTo)) {
				joinTo = [joinTo];
			}
			let keyCheck = ModelRelations.validJoinKeys(relationModel, joinTo);
			if (keyCheck !== true) {
				model.log("join->"+key, "invalid 'to' keys => " + keyCheck, null, "error", true);
				isValid = false;
			}
		} else {
			model.log("join->"+key, "missing to", null, "error", true);
			isValid = false;
		}

		if (throughModel) {
			if (joinThroughFrom) {
				if (!Array.isArray(joinThroughFrom)) {
					joinThroughFrom = [joinThroughFrom];
				}
				let keyCheck = ModelRelations.validJoinKeys(throughModel, joinThroughFrom);
				if (keyCheck !== true) {
					model.log("join->"+key, "invalid 'through.from' keys => " + keyCheck, null, "error", true);
					isValid = false;
				}
			} else {
				model.log("join->"+key, "missing 'through.from'", null, "error", true);
				isValid = false;
			}
			if (joinThroughTo) {
				if (!Array.isArray(joinThroughTo)) {
					joinThroughTo = [joinThroughTo];
				}
				let keyCheck = ModelRelations.validJoinKeys(throughModel, joinThroughTo);
				if (keyCheck !== true) {
					model.log("join->"+key, "invalid 'through.to' keys => " + keyCheck, null, "error", true);
					isValid = false;
				}
			} else {
				model.log("join->"+key, "missing 'through.to'", null, "error", true);
				isValid = false;
			}
		}

		if (!isValid) {
			relationModel.log("join::" + relationModel.tableName, "invalid");
			return;
		}

		let index = [];
		results.forEach(
			(row, i) => {
				let obj = {
					parentModel : model.tableName,
					relationModel : relationModel.tableName,
					from: {},
					to: {},
					index: i,
					type : relationType
				}
				joinFrom.forEach(
					(joinFromKey, i) => {
						let value = ModelRelations.getValue(row, joinFromKey);
						if (value !== null) {
							obj.from[joinFromKey] = row[joinFromKey];
							if (throughModel) {
								obj.through = obj.through || {throughModel : throughModel.tableName, from: {}, to: {}};
								if (joinThroughFrom[i]) {
									obj.through.from[joinThroughFrom[i]] = value;
								}
							} else {
								obj.to[joinTo[i]] = value;
							}
						}
					}
				)
				if (obj.through && Object.keys(obj.through.from).length === joinThroughFrom.length) {
					index.push(obj);
				} else if (Object.keys(obj.to).length === joinTo.length) {
					index.push(obj);
				}
			}
		)

		if (index.length === 0) {
			model.log("join -> " + key, "No Keys To Join On");
			return;
		}

		if (throughModel) {
			let joinThrough = {
				where : joinThroughWhere || {}
			};

			index.forEach(
				(row) => {
					Object.keys(row.through.from).forEach(
						(field) => {
							joinThrough.where[field] = joinThrough.where[field] || {in: []};
							let value = row.through.from[field];
							if (Array.isArray(value)) {
								joinThrough.where[field].in = joinThrough.where[field].in.concat(value);
							} else {
								joinThrough.where[field].in.push(value)
							}
						}
					)
				}
			)

			joinThrough.select = joinThroughFrom.concat(joinThroughTo);
			joinThrough.sort = joinThroughSort || null;

			if (joinThrough.debug || model.debug) {
				throughModel.debug = true;
			}

			throughList = await throughModel.query(joinThrough);
			model.log("join", "throughModel query time -> " + (new Date().getTime() - startTime) + " throughList->" + throughList.length);

			if (throughList.error || throughList.length === 0) {
				return;
			}

			let addThroughToValue = (row, throughToKey, joinToKey, destinationValue) => {
				if (Array.isArray(row.through.to[throughToKey])) {
					if (Array.isArray(destinationValue)) {
						row.through.to[throughToKey] = row.through.to[throughToKey].concat(destinationValue);
						row.to[joinToKey] = row.to[joinToKey].concat(destinationValue);
					} else {
						row.through.to[throughToKey].push(destinationValue);
						row.to[joinToKey].push(destinationValue);
					}
				} else {
					row.through.to[throughToKey] = destinationValue;
					row.to[joinToKey] = destinationValue;
				}
			}

			index.forEach(
				(indexItem, rowIndex) => {
					throughList.forEach(
						(throughRow, throughIndex) => {
							joinThroughFrom.forEach(
								(joinThroughFromKey, index) => {
									let throughToKey = joinThroughTo[index];
									let joinToKey = joinTo[index];
									let sourceValue = ModelRelations.getValue(throughRow, joinThroughFromKey);
									let targetValue = indexItem.through.from[joinThroughFromKey];
									let destinationValue = ModelRelations.getValue(throughRow, throughToKey);
									if (relationType === "has-many") {
										indexItem.through.to[throughToKey] = indexItem.through.to[throughToKey] || [];
										indexItem.to[joinToKey] = indexItem.to[joinToKey] || [];
									}
									if (Array.isArray(sourceValue) && Array.isArray(targetValue)) { // {to
										if (_.intersection(sourceValue, targetValue) > 0) {
											addThroughToValue(indexItem, throughToKey, joinToKey, destinationValue);
										}
									} else if (Array.isArray(sourceValue)) {
										if (sourceValue.includes(targetValue)) {
											addThroughToValue(indexItem, throughToKey, joinToKey, destinationValue);
										}
									} else if (Array.isArray(targetValue)) {
										if (targetValue.includes(sourceValue)) {
											addThroughToValue(indexItem, throughToKey, joinToKey, destinationValue);
										}
									} else
										//source is value destination is value
									if (sourceValue === targetValue) {
										addThroughToValue(indexItem, throughToKey, joinToKey, destinationValue);
									} else {

									}
								}
							)

						}
					);

					if (Object.keys(indexItem.through.to).length === 0) {
						index.splice(rowIndex, 1);
					}
				}
			);
			relationModel.log("join",index);
			if (index.length === 0) { //no through items found
				return;
			}
		}

		let j = _.clone(join);

		if (j.debug || model.debug) {
			relationModel.debug = true;
		}

		startTime = new Date().getTime();

		j.where = Object.assign(relation.where || {}, j.where || {});
		ModelRelations.addWhereTo(j, index);

		j.sort = relations[key].sort || relationModel.defaultSort;
		j.offset = relations[key].offset || 0;
		j.limit = j.limit || relation.limit || null;

		if (!originalSelect || originalSelect.length === 0) {
			await ModelRelations.processSelect(relationModel, key, j);
		}

		//must select the joinTo keys
		if (j.select) {
			j.select = _.uniq(j.select.concat(joinTo));
		}

		list = await relationModel.query(j);
		if (list.error) {
			console.log(list);
			return;
		}

		relationModel.log("join:list", list);
		relationModel.log("join:index", index);
		relationModel.log("join:lastCommand", relationModel.lastCommand.toString())
		relationModel.log("join", relationType + " query time -> " + (new Date().getTime() - startTime)+ " records->" + list.length);

		let connected = 0;
		list.forEach(
			(row, i) => {
				index.forEach(
					(indexItem, k) => {
						let matches = {};
						joinTo.forEach(
							(joinToKey, j) => {
								let fromValue = ModelRelations.getValue(indexItem.to, joinToKey);
								let toValue = ModelRelations.getValue(row, joinToKey);

								if (Array.isArray(toValue) && Array.isArray(fromValue)) {
									if (_.intersection(toValue, fromValue).length > 0) {
										matches[joinToKey] = toValue;
									}
								} else
									//source is array destination is value
								if (Array.isArray(toValue)) {
									if (toValue.includes(fromValue)) {
										matches[joinToKey] = toValue;
									}
								} else if (Array.isArray(fromValue)) {
									if (fromValue.includes(toValue)) {
										matches[joinToKey] = toValue;
									}
								} else
									//source is value destination is value
									relationModel.log("checkJoin", `${joinToKey} =  ${fromValue} vs ${toValue}`)
								if (toValue === fromValue) {
									matches[joinToKey] = toValue;
								}
							}
						)

						if (Object.keys(matches).length === joinTo.length) {
							if (relationType === "has-many") {
								results[indexItem.index][key] = !Array.isArray(results[indexItem.index][key]) ? [] : results[indexItem.index][key];
								results[indexItem.index][key].push(row);
							} else {
								//NOTE: this will replace anything with the same name
								//So sometimes the value will be an object
								results[indexItem.index][key] = row;
							}
							connected++;
						}
					}
				)
			}
		)

		relationModel.log("join", `${key}::list.length->${list.length} connected->${connected}`)
	}

	/**
	 * @param {ModelBase} model
	 * @param {array} results
	 * @param {object} foreignKeys
	 * @param {string} key
	 * @returns {Promise<void>}
	 */
	static async doForeignKey(model, results, foreignKeys, key) {
		let startTime = new Date().getTime();
		let j = _.clone(foreignKeys[key]);

		let ForeignKeyModel = model.loadModel(foreignKeys[key].model || foreignKeys[key].modelClass);
		if (!ForeignKeyModel) {
			console.warn("Foreign Key Join Error. " + key + " does not exist");
		}
		let foreignKeyModel = new ForeignKeyModel(model.req);
		await foreignKeyModel.init();
		if (foreignKeys[key].debug || model.debug) {
			foreignKeyModel.debug = true;
		}
		let joinFrom = foreignKeys[key].from || key;
		if (!Array.isArray(joinFrom)) {
			joinFrom = [joinFrom];
		}
		let joinTo = foreignKeys[key].to;
		if (!Array.isArray(joinTo)) {
			joinTo = [joinTo];
		}

		let index = [];
		results.forEach(
			(row, i) => {
				let obj = {
					parentModel : model.tableName,
					relationModel : foreignKeyModel.tableName,
					from: {},
					to: {},
					index: i,
					type : "foreignKey"
				}
				joinFrom.forEach(
					(joinFromKey, i) => {
						let value = ModelRelations.getValue(row, joinFromKey);
						if (value !== null) {
							obj.from[joinFromKey] = row[joinFromKey];
							obj.to[joinTo[i]] = value;
						}
					}
				)
				index.push(obj);
			}
		)

		if (index.length === 0) {
			model.log("join -> " + key, "No Keys To Join On");
			return;
		}

		if (index.length > 0) {

			let q = {
				where: {}
			};

			ModelRelations.addWhereTo(q, index);

			q.select = foreignKeys[key].name ? [foreignKeys[key].name] : ['name'];
			q.select = q.select.concat(joinTo);
			q.select.push(foreignKeyModel.primaryKey);

			if (j.join) {
				q.join = _.clone(j.join);
			}

			let list = await foreignKeyModel.query(q);

			if (list.error) {
				foreignKeyModel.log("doForeignKey", list);
				return;
			}

			let connected = 0;
			list.forEach(
				(row, i) => {
					index.forEach(
						(indexItem, k) => {
							let matches = {};
							joinTo.forEach(
								(joinToKey, j) => {

									let fromValue = ModelRelations.getValue(indexItem.to, joinToKey);
									let toValue = ModelRelations.getValue(row, joinToKey);

									if (Array.isArray(toValue) && Array.isArray(fromValue)) {
										if (_.intersection(toValue, fromValue).length > 0) {
											matches[joinToKey] = toValue;
										}
									} else
										//source is array destination is value
									if (Array.isArray(toValue)) {
										if (toValue.includes(fromValue)) {
											matches[joinToKey] = toValue;
										}
									} else if (Array.isArray(fromValue)) {
										if (fromValue.includes(toValue)) {
											matches[joinToKey] = toValue;
										}
									} else
										//source is value destination is value
									if (toValue === fromValue) {
										matches[joinToKey] = toValue;
									}
								}
							)

							if (Object.keys(matches).length === joinTo.length) {
								results[indexItem.index].foreignKeys = results[indexItem.index].foreignKeys || {}
								if (foreignKeys[key].name && !row.name) {
									row.name = ModelRelations.getValue(row, foreignKeys[key].name);
								} else if (foreignKeyModel.name && !row.name) {
									row.name = ModelRelations.getValue(row, foreignKeyModel.name);
								}
								results[indexItem.index].foreignKeys[key] = row;
								connected++;
							}
						}
					)
				}
			)
			foreignKeyModel.log("join", `${key}::list.length->${list.length} connected->${connected}`)
		}
	}

	async update(model, data) {
		let relations = model.relations || {};
		let keys = Object.keys(data);

		while (keys.length > 0) {
			let key = keys[0];

			if (relations[key]) {
				let relatedProperty = model.relations[key];

				if ("throughModel" in relatedProperty) {
					keys.shift();
					continue;
				}

				let Model = model.loadModel(relatedProperty.modelClass || relatedProperty.model);
				let model = new Model(model.req);
				let primaryKey = model.primaryKey;
				let itemData = _.clone(data[key]);
				let result;
				switch (relatedProperty.relation || relatedProperty.type) {
					case "HasOne":
						if (itemData instanceof Array && itemData.length === 1) {
							itemData = itemData[0];
						}
						if (primaryKey in itemData) {
							result = await model.update(itemData[primaryKey], itemData);
							if (!result.error) {
								data[key] = result;
							}
						}
					case "HasMany":
						if (!itemData instanceof Array) {
							itemData = [itemData];
						}
						for (let i = 0; i < itemData.length; i++) {
							if (primaryKey in itemData[i]) {
								result = await model.update(itemData[i][primaryKey], itemData[i]);
								if (!result.error) {
									data[key][i] = result;
								}
							}
						}
						break;
				}
			}
			keys.shift();
		}
	}

	async create(model, data) {

		let relations = model.relations || {};
		let keys = Object.keys(data);

		while (keys.length > 0) {
			let key = keys[0];

			if (relations[key]) {
				let relatedProperty = model.relations[key];

				if ("throughClass" in relatedProperty) {
					keys.shift();
					continue;
				}

				let Model = model.loadModel(relatedProperty.modelClass || relatedProperty.model);
				let model = new Model(model.req);
				let primaryKey = model.primaryKey;
				let itemData = _.clone(data[key]);
				let result;
				switch (relatedProperty.relation || relatedProperty.type) {
					case "HasOne":
						if (itemData instanceof Array && itemData.length === 1) {
							itemData = itemData[0];
						}
						if (data[relatedProperty.join.from]) {
							itemData[relatedProperty.join.to] = data[relatedProperty.join.from];
							result = await model.create(itemData);
							if (!result.error) {
								data[key] = result;
							}
						}
					case "HasMany":
						if (!itemData instanceof Array) {
							itemData = [itemData];
						}
						for (let i = 0; i < itemData.length; i++) {
							if (data[relatedProperty.join.from]) {
								itemData[i][relatedProperty.join.to] = data[relatedProperty.join.from];
								result = await model.create(itemData[i][primaryKey], itemData[i]);
								if (!result.error) {
									data[key][i] = result;
								}
							}
						}
						break;
				}
			}
			keys.shift();
		}
	}
}

module.exports = ModelRelations;
