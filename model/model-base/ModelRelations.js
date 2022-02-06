"use strict";
const _ = require("lodash");

class ModelRelations {
	static loadModel(modelName){
		if (typeof modelName !== "string") {
			return modelName;
		}
		global.modelCache = global.modelCache || {};
		global.modelCache[modelName] = require("../../../model/" + modelName);
		return global.modelCache[modelName];
	}

	/**
	 * Add any selects defined in the relation
	 * @param {object} model
	 * @param {string} key
	 * @param {object} j
	 */
	static processSelect(model, key, j) {
		let relations = model.relations;
		if (!relations) {
			return;
		}
		if (!relations[key]) {
			model.log("processSelect", "no relation for " + key);
			model.log("processSelect relations->", relations);
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
		if (key.indexOf(".")) {
			return _.get(object,key);
		}
		return object[key];
	}

	/**
	 * If a select was present remove extra keys from join
	 * @param results
	 * @param key
	 * @param originalSelect
	 */
	static processExtras(results, key, originalSelect){
		if (results &&
			results.length > 0 &&
			results[0][key] &&
			originalSelect &&
			originalSelect.length > 0) {
			let keys = Object.keys(results[0][key]);
			for(let i = 0; i < results.length; i++) {
				keys.forEach((field)=> {
						if (originalSelect.indexOf(field) === -1) {
							delete results[i][key][field];
						}
					}
				);
			}
		}
	};

	static addWhereTo (j, index) {
		index.forEach(
			(row) => {
				Object.keys(row.to).forEach(
					(field, index) => {
						j.where[field] = j.where[field] || {in:[]};
						j.where[field].in.push(row.to[field]);
						j.where[field].in = _.uniq(j.where[field].in);
					}
				)
			}
		)
	}

	static async join (model, results, query){

		let relations = await model.getRelations();
		let foreignKeys = await model.getForeignKeys();

		if (!relations && !foreignKeys) {
			return results;
		}

		let findOne = false;

		if (!_.isArray(results)) {
			results = [results];
			findOne = true;
		}

		let join = _.clone(query.join);
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
		} else if (_.isArray(join)) {
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
			if (relations[key]) {
				model.log("join", "key => " + key);

				let relation = _.clone(relations[key]);
				if (relation.allowedRoles && (model.req && !model.req.hasRole(relation.allowedRoles))) {
					keys.shift();
					continue;
				}

				if (join[key] === true) {
					join[key] = {}
				} else if (join[key] === false) {
					keys.shift();
					continue;
				}

				let list;
				let throughList;

				let originalSelect = relation.join.select ? _.clone(relation.join.select) : null;
				let joinFrom = relation.join.from;
				let joinTo = relation.join.to;
				let joinThroughFrom = relation.join.through ? relation.join.through.from : null;
				let joinThroughTo = relation.join.through ? relation.join.through.to : null;
				let joinThroughWhere = relation.join.through ? relation.join.through.where : null;
				let joinThroughSort = relation.join.through ? relation.join.through.sort : null;
				let removeJoinTo = false; //keys not requested

				if (joinFrom && !_.isArray(joinFrom)) {
					joinFrom = [joinFrom];
				}
				if (joinTo && !_.isArray(joinTo)) {
					joinTo = [joinTo];
				}
				if (joinThroughFrom && !_.isArray(joinThroughFrom)) {
					joinThroughFrom = [joinThroughFrom];
				}
				if (joinThroughTo && !_.isArray(joinThroughTo)) {
					joinThroughTo = [joinThroughTo];
				}

				let index = [];
				let buildIndex = () => {
					results.forEach(
						(row, i) => {
							let obj = {
								from : {},
								to : {},
								index : i
							}
							joinFrom.forEach(
								(item, i) => {
									let value = ModelRelations.getValue(row, item);
									if (value !== null) {
										obj.from[item] = row[item];
										if (relation.join.through) {
											obj.through = obj.through || {from: {}, to: {}};
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
				}
				buildIndex();

				if (index.length === 0) {
					model.log("join -> " + key, "No Keys To Join On");
					keys.shift();
					continue;
				}

				if (relation.join.through) {
					const ThroughModel = model.loadModel(relation.throughModel || relation.throughClass);
					if (!ThroughModel) {
						console.error("No model " + relation.throughModel + " exists");
						keys.shift();
						continue;
					}

					let joinThrough = _.clone(join[key]);
					joinThrough.where = joinThroughWhere || {};

					index.forEach(
						(row) => {
							Object.keys(row.through.from).forEach(
								(field) => {
									joinThrough.where[field] = joinThrough.where[field] || {in:[]};
									joinThrough.where[field].in.push(row.through.from[field])
								}
							)
						}
					)

					joinThrough.select = joinThroughFrom.concat(joinThroughTo);
					joinThrough.sort = joinThroughSort || null;

					let throughModel = new ThroughModel(model.req);
					if (joinThrough.debug || model.debug) {
						throughModel.debug = true;
					}
					throughList = await throughModel.query(joinThrough);
					model.log("join","throughModel query time -> " + (new Date().getTime() - startTime));

					if (throughList.error || throughList.length === 0) {
						keys.shift();
						continue;
					}

					index.forEach(
						(row, rowIndex) => {
							throughList.forEach(
								(throughRow) => {
									Object.keys(row.through.from).forEach(
										(joinThroughFromKey, index) => {
											let throughToKey = joinThroughTo[index];
											let joinToKey = joinTo[index];
											let sourceValue = ModelRelations.getValue(throughRow, joinThroughFromKey);
											let targetValue = row.through.from[joinThroughFromKey];
											let destinationValue = ModelRelations.getValue(throughRow, throughToKey);
											if (_.isArray(sourceValue) && _.isArray(targetValue)) {
												if (_.intersection(sourceValue, targetValue) > 0) {
													row.through.to[throughToKey] = destinationValue;
													row.to[joinToKey] = destinationValue;
												}
											} else
											if (_.isArray(sourceValue)) {
												if (sourceValue.includes(targetValue)) {
													row.through.to[throughToKey] = destinationValue;
													row.to[joinToKey] = destinationValue;
												}
											} else
											if (_.isArray(targetValue)) {
												if (targetValue.includes(sourceValue)) {
													row.through.to[throughToKey] = destinationValue;
													row.to[joinToKey] = destinationValue;
												}
											} else
												//source is value destination is value
											if (sourceValue === targetValue) {
												row.through.to[throughToKey] = destinationValue;
												row.to[joinToKey] = destinationValue;
											}
										}
									)

								}
							);
							model.log("join:: row", row);
							if (Object.keys(row.to) === 0) {
								index.splice(rowIndex, 1);
							}
						}
					);

				} else {

				}

				model.log("join","joinTo => " + joinTo);

				let j = _.clone(join[key]);
				let relationType = ModelRelations.relationType(relation.relation || relation.type);
				let relationModelClassName = relation.modelClass || relation.model;
				let RelationModel = model.loadModel(relationModelClassName);
				if (!RelationModel) {
					console.warn("Join Error. Model " + relationModelClassName + " does not exist");
					keys.shift();
					continue;
				}

				let relationModel = new RelationModel(model.req);
				await relationModel.init();
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
					ModelRelations.processSelect(relationModel, key, j);
				}

				//must select the targetJoin key
				if (j.select && _.indexOf(j.select, joinTo) === -1) {
					removeJoinTo = true;
					j.select.push(joinTo);
				}

				switch (relationType) {
					case "has-one" :

						j.limit = 1;
						list = await relationModel.query(j);

						if (list.error) {
							console.log(list);
							keys.shift();
							continue;
						}

						break;
					case "has-many" :

						list = await relationModel.query(j);

						if (list.error) {
							console.log(list);
							keys.shift();
							continue;
						}
				}

				model.log("join", relationType + " query time -> " + (new Date().getTime() - startTime));

				list.forEach(
					(row, i) => {
						index.forEach(
							(indexItem, k) => {
								joinTo.forEach(
									(joinToKey, j) => {
										let targetKey = Object.keys(indexItem.to)[j];
										let targetValue = ModelRelations.getValue(indexItem.to, targetKey);
										let sourceValue = ModelRelations.getValue(row ,joinToKey);

										if (_.isArray(sourceValue) && _.isArray(targetValue)) {
											indexItem.to[joinToKey] = sourceValue;
										} else
											//source is array destination is value
										if (_.isArray(sourceValue)) {
											indexItem.to[joinToKey] = sourceValue;
										} else
										if (_.isArray(targetValue)) {
											indexItem.to[joinToKey] = sourceValue;
										} else
											//source is value destination is value
										if (sourceValue === targetValue) {
											indexItem.to[joinToKey] = sourceValue;
										}
									}
								)
								//console.log(indexItem);
								if (Object.keys(indexItem.to).length === joinTo.length) {
									if (relationType === "has-many") {
										results[indexItem.index][key] = results[indexItem.index][key] || [];
										results[indexItem.index][key].push(row);
									} else {
										results[indexItem.index][key] = results[indexItem.index][key] || {}
										Object.assign(results[indexItem.index][key], row);
									}
								}
							}
						)
					}
				)

			} else if (foreignKeys[key]) {
				let j = _.clone(foreignKeys[key]);

				let ForeignKeyModel = model.loadModel(foreignKeys[key].model || foreignKeys[key].modelClass);
				if (!ForeignKeyModel) {
					console.warn("Foreign Key Join Error. " + key + " does not exist");
				}
				let foreignKeyModel = new ForeignKeyModel(model.req);
				await foreignKeyModel.init();
				if (join[key].debug || foreignKeys[key].debug || model.debug) {
					foreignKeyModel.debug = true;
				}
				let joinFrom = foreignKeys[key].from || key;
				if (!_.isArray(joinFrom)) {
					joinFrom = [joinFrom];
				}
				let joinTo = foreignKeys[key].to;
				if (!_.isArray(joinTo)) {
					joinTo = [joinTo];
				}

				let index = [];
				let buildIndex = () => {
					results.forEach(
						(row, i) => {
							let obj = {
								from : {},
								to : {},
								index : i
							}
							joinFrom.forEach(
								(item, i) => {
									let value = ModelRelations.getValue(row, item);
									if (value !== null) {
										obj.to[joinTo[i]] = value;
									}
								}
							)
							if (Object.keys(obj.to).length === joinTo.length) {
								index.push(obj);
							}
						}
					)
				}
				buildIndex();

				if (index.length > 0) {

					let q = {
						where: {

						}
					};

					ModelRelations.addWhereTo(q, index);

					q.select = foreignKeys[key].name ? [foreignKeys[key].name] : ['name'];
					q.select = q.select.concat(joinTo);
					q.select.push(foreignKeyModel.primaryKey);

					if (j.join) {
						q.join = _.clone(j.join);
					}

					console.log(JSON.stringify(q));

					let list = await foreignKeyModel.query(q);

					if (list.error) {
						keys.shift();
						continue;
					}

					list.forEach(
						(row, i) => {
							index.forEach(
								(indexItem, k) => {
									joinTo.forEach(
										(joinToKey, j) => {
											let targetKey = Object.keys(indexItem.to)[j];
											let targetValue = ModelRelations.getValue(indexItem.to, targetKey);
											let sourceValue = ModelRelations.getValue(row ,joinToKey);

											if (_.isArray(sourceValue) && _.isArray(targetValue)) {
												indexItem.to[joinToKey] = sourceValue;
											} else
												//source is array destination is value
											if (_.isArray(sourceValue)) {
												indexItem.to[joinToKey] = sourceValue;
											} else
											if (_.isArray(targetValue)) {
												indexItem.to[joinToKey] = sourceValue;
											} else
												//source is value destination is value
											if (sourceValue === targetValue) {
												indexItem.to[joinToKey] = sourceValue;
											}
										}
									)
									if (joinTo.length === Object.keys(indexItem.to).length) {
										results[indexItem.index].foreignKeys = results[indexItem.index].foreignKeys || {}
										results[indexItem.index].foreignKeys[key] = results[indexItem.index].foreignKeys[key] || {}
										if (foreignKeys[key].name && !row.name) {
											row.name = ModelRelations.getValue(row, foreignKeys[key].name);
										} else if (foreignKeyModel.name && !row.name) {
											row.name = ModelRelations.getValue(row, foreignKeyModel.name);
										}
										Object.assign(results[indexItem.index].foreignKeys[key], row);
									}
								}
							)
						}
					)
				}
			}

			keys.shift();
		}

		if (findOne) {
			return results[0];
		}
		return results;
	}

	async update(model, data) {
		let relations = model.relations || {};
		let keys = Object.keys(data);

		while(keys.length > 0) {
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
						for(let i = 0; i < itemData.length; i++) {
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

		while(keys.length > 0) {
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
						for(let i = 0; i < itemData.length; i++) {
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
