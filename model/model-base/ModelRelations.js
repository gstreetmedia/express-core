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
	 * @param {object} relations
	 * @param {object} results
	 * @param {string} key
	 * @param {object} j
	 */
	static processWhere(relations, results, key, j) {
		if (!relations[key]) {
			console.log("processWhere no relation for " + key);
		}
		if (relations[key] && relations[key].where) {
			j.where = j.where || {};
			for (let p in relations[key].where) {
				let expression = j.where[p] || relations[key].where[p];
				if (_.isString(expression)) {
					expression = {"=":expression}
				}
				let compare = Object.keys(expression)[0];
				if (expression[compare].indexOf("{{") === 0) {
					let targetKey = expression[compare].replace("{{", "").replace("}}","");
					try {
						if (results[0][targetKey]) {
							expression[compare] = results[0][targetKey];
						}
					} catch (e) {
						console.log("processWhere issue join " + targetKey);
						console.log(results);
					}
				}
				j.where[p] = expression;
			}
		}
	}

	/**
	 * Add any selects defined in the relation
	 * @param {object} relations
	 * @param {string} key
	 * @param {object} j
	 */
	static processSelect(relations, key, j) {
		if (!relations[key]) {
			console.log("processSelect no relation for " + key);
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

	static async join (model, results, query){

		let relations = await model.getRelations();

		model.log("join::relations", relations);

		let foreignKeys = await model.getForeignKeys();

		model.log("join::foreignKeys", foreignKeys);

		if (!relations && !foreignKeys) {
			return results;
		}

		let fromIndex = {};
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

		while (keys.length > 0) {
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

				let targetKeys = [];
				let joinFromKeys = {};
				let joinThroughFromKeys = {};
				let joinThroughToKeys = {};
				let joinToKeys = {};

				//TODO we need a more flexible from, to, from to that supports arrays
				/**
				 * eg. from : ["key1","key2"] to: ["key3", "key4"]
				 */
				/*
				if (_.isArray(joinFrom)) {
					let i = 0;
					joinFrom.forEach(
						(joinFromItem) => {
							let items = _.map(results, joinFromItem);
							joinFromKeys[joinFromItem] = items;
							joinToKeys[joinTo[i]] = items;
							i++;
						}
					)
					console.log(joinFromKeys);
					return;
				} else if (joinFrom.indexOf(".") !== -1) {

				} else {
					let items = _.map(results, joinFrom);
					joinToKeys[joinTo] = items;
					joinFromKeys[joinFrom] = items;
				}

				 */

				for (let i = 0; i < results.length; i++) { //grab the primary keys from the
					if (joinFrom.indexOf(".") !== -1 && _.get(results[i], joinFrom, null)) {
						//Allow for join on json value
						let value = _.get(results[i], joinFrom, null);
						targetKeys.push(value);
						fromIndex[value] = i;
					} else if (results[i] && results[i][joinFrom]) {
						if (_.isArray(results[i][joinFrom])) {
							targetKeys = targetKeys.concat(results[i][joinFrom]);
						} else {
							targetKeys.push(results[i][joinFrom]);
						}
						fromIndex[results[i][joinFrom]] = i;
					}
				}

				targetKeys = _.uniq(targetKeys);

				let startTime = new Date().getTime();
				model.log("join", "targetKeys => " + targetKeys);
				model.log("join","joinFrom => " + joinFrom);
				model.log("join","joinThroughTo => " + joinThroughTo);
				model.log("join","joinThroughFrom => " + joinThroughFrom);
				model.log("join","joinTo => " + joinTo);

				let throughModelClass = relation.throughClass || relation.throughModel || relation.throughModelClass;

				if (throughModelClass) { //build new targetKey based on the pivot table

					let joinThrough = _.clone(join[key]);
					joinThrough.where = joinThroughWhere || {};
					joinThrough.where[joinThroughFrom] = {in: targetKeys};
					joinThrough.select = [joinThroughFrom, joinThroughTo];
					joinThrough.sort = joinThroughSort || null;

					const ThroughModel = model.loadModel(throughModelClass);
					let throughModel = new ThroughModel(model.req);
					if (joinThrough.debug) {
						throughModel.debug = true;
					}
					throughList = await throughModel.query(joinThrough);
					model.log("join","throughModel query time -> " + (new Date().getTime() - startTime));
					if (throughList.error || throughList.length === 0) {
						keys.shift();
						continue;
					}

					targetKeys = _.uniq(_.map(throughList, joinThroughTo));
					targetKeys = _.flatten(targetKeys);
					targetKeys = _.uniq(targetKeys);
				}

				let j = _.clone(join[key]);
				//keep a copy so we can clean out non selected props

				let relationType = relation.relation || relation.type;
				let relationModelClassName = relation.modelClass || relation.model;
				let RelationModel = model.loadModel(relationModelClassName);
				if (!RelationModel) {
					console.warn("Join Error. Model " + relationModelClassName + " does not exist");
				}
				let relationModel = new RelationModel(model.req);

				switch (relationType.toLowerCase()) {
					case "hasone":
					case "has-one":
					case "one":

						if (j.debug) {
							relationModel.debug = true;
						}

						if (relations[key].where) {
							ModelRelations.processWhere(relations, results, key, j);
						}

						j.where = j.where || {};
						j.where[joinTo] = {in: targetKeys};
						j.sort = j.sort || null;
						j.limit = j.limit || relation.limit || targetKeys.length;

						if (fullJoin) {
							j.join = "*"
						}

						if (!originalSelect || originalSelect.length === 0) {
							ModelRelations.processSelect(relations, key, j);
						}

						if (j.select && _.indexOf(j.select, joinTo) === -1) {
							j.select.push(joinTo);
							removeJoinTo = true;
						}

						startTime = new Date().getTime();
						list = await relationModel.query(j);
						model.log("join","hasone query time -> " + (new Date().getTime() - startTime));

						if (list.error) {
							keys.shift();
							continue;
						}

						if (throughModelClass) {
							list.forEach(
								(row) => {
									let throughItems = [];
									throughList.forEach(
										function(item) {
											if (_.isArray(item[joinThroughTo])) {
												if (item[joinThroughTo].indexOf(row[joinTo]) !== -1) {
													throughItems.push(item)
												}
											} else if (item[joinThroughTo] === row[joinTo]) {
												throughItems.push(item);
											}
										}
									);
									throughItems.forEach(
										(throughItem) => {
											try {
												let resultsIndex;
												if (_.isArray(throughItem[joinThroughFrom])) {
													for (let i = 0; i < throughItem[joinThroughFrom].length; i++) {
														let k = throughItem[joinThroughFrom][i];
														if (k in fromIndex) {
															resultsIndex = fromIndex[k];
															break;
														}
													}
												} else {
													resultsIndex = fromIndex[throughItem[joinThroughFrom]];
												}
												if (removeJoinTo) {
													delete row[joinTo];
												}
												results[resultsIndex][key] = row;

											} catch (e) {
												console.log("join through error " + relation.throughClass);
											}
										}
									)
								}
							)
						} else {
							for (let i = 0; i < list.length; i++) {
								//TODO Arrays
								let o = {[joinFrom]:list[i][joinTo]};
								for(let k = 0; k < results.length; k++) {
									let item = results[k];
									if (_.isArray(item[joinFrom]) && item[joinFrom].indexOf(list[i][joinTo]) !== -1) {
										results[k][key] = list[i];
									} else if (item[joinFrom] === list[i][joinTo]) {
										results[k][key] = list[i];
									}
								}
							}
						}

						ModelRelations.processExtras(results, key, originalSelect);

						break;
					case "hasmany" :
					case "has-many" :
					case "many" :

						if (j.debug) {
							relationModel.debug = true;
						}

						if (relations[key].where) {
							ModelRelations.processWhere(relations, results, key, j);
						}

						j.where = j.where || {};
						if (joinFromKeys) {

						}
						j.where[joinTo] = {in: targetKeys};
						j.sort = relations[key].sort || null;
						j.offset = relations[key].offset || 0;
						j.limit = j.limit || relation.limit || null;

						if (!originalSelect || originalSelect.length === 0) {
							ModelRelations.processSelect(relations, key, j);
						}

						//must select the targetJoin key
						if (j.select && _.indexOf(j.select, joinTo) === -1) {
							removeJoinTo = true;
							j.select.push(joinTo);
						}

						if (fullJoin) {
							j.join = "*"
						}

						startTime = new Date().getTime();
						list = await relationModel.query(j);
						model.log("join","hasmany query time -> " + (new Date().getTime() - startTime));

						if (list.error) {
							keys.shift();
							continue;
						}

						if (throughModelClass) {
							list.forEach(
								function (row) {
									let throughItems = [];
									throughList.forEach(
										function(item) {
											if (_.isArray(item[joinThroughTo])) {
												if (item[joinThroughTo].indexOf(row[joinTo]) !== -1) {
													throughItems.push(item)
												}
											} else if (item[joinThroughTo] === row[joinTo]) {
												throughItems.push(item);
											}
										}
									)
									throughItems.forEach(
										function(throughItem){
											let resultsIndex;
											if (_.isArray(throughItem[joinThroughFrom])) {
												for (let i = 0; i < throughItem[joinThroughFrom].length; i++) {
													let k = throughItem[joinThroughFrom][i];
													if (k in fromIndex) {
														resultsIndex = fromIndex[k];
														break;
													}
												}
											} else {
												resultsIndex = fromIndex[throughItem[joinThroughFrom]];
											}

											results[resultsIndex][key] = results[resultsIndex][key] || [];
											let filter = {[relation.join.to]:row[relation.join.to]};
											if (!_.find(results[resultsIndex][key], filter)) {
												if (removeJoinTo) {
													delete row[joinTo];
												}
												results[resultsIndex][key].push(row);
											}
										}
									);
								}
							)
						} else {

							for (let i = 0; i < list.length; i++) {
								try {
									//If the joinFrom is an array, we need to recurse all results
									//to find out if the array of each matches the joinTo
									try {
										if(model.properties[joinFrom].type === "array") {
											for(let k = 0; k < results.length; k++) {
												if (results[k][joinFrom].includes(list[i][joinTo])) {
													results[k][key] = results[k][key] || [];
													results[k][key].push(list[i]);
												}
											}
										} else {
											for(let k = 0; k < results.length; k++) {
												if (results[k][joinFrom] === list[i][joinTo]) {
													results[k][key] = results[k][key] || [];
													results[k][key].push(list[i]);
												}
											}
										}
									} catch (e) {
										console.log("error in joinFrom " + joinFrom);
									}
									/*


									try {
										if (!results[fromIndex[list[i][joinTo]]][key]) {
											results[fromIndex[list[i][joinTo]]][key] = [];
										}
									} catch(e) {
										console.log("something went wrong");
										console.log("joinTo -> " + joinTo);
										//console.log(list[i]);
									}

									let targetKey = list[i][joinTo];
									let value = list[i];

									if (removeJoinTo === true) {
										value = _.omit(value, joinTo);
									}

									try {
										results[fromIndex[targetKey]][key].push(value);
									} catch (e) {
										console.log(results);
										console.log(targetKey);
										console.log(fromIndex);
										console.log(e);
									}

									 */

								} catch (e) {
									console.log("Could not join " + key + " for " + model.tableName);
									console.log("joinTo => " + joinTo);
									//console.log(fromIndex);
									console.log(e);
									//console.log(j.select);
									//console.log(m.lastCommand.toString());
								}
							}
						}

						ModelRelations.processExtras(results, key, originalSelect);

						break;
				}
			} else if (foreignKeys[key]) {

				let j = _.clone(foreignKeys[key]);

				let ForeignKeyModel = model.loadModel(foreignKeys[key].model || foreignKeys[key].modelClass);
				if (!ForeignKeyModel) {
					console.warn("Foreign Key Join Error. " + key + " does not exist");
				}
				let foreignKeyModel = new ForeignKeyModel(model.req);
				if (join[key].debug || foreignKeys[key].debug) {
					foreignKeyModel.debug = true;
				}

				let idList = [];
				results.forEach(
					(item) => {
						if (item[key] !== null) {
							if (_.isArray(item[key])) {
								idList.concat(item[key]);
							} else {
								idList.push(item[key]);
							}
						}
					}
				);


				if (idList.length > 0) {
					idList = _.uniq(idList);

					let primaryKey = foreignKeys[key].to || foreignKeyModel.primaryKey;
					let q = {
						where: {
							[primaryKey]: {"in": idList}
						}
					};

					if (j.select) {
						q.select = j.select;
					}

					if (j.join) {
						q.join = _.clone(j.join);
					}

					let list = await foreignKeyModel.query(q);

					let context = this;

					if (!list.error) {
						list.forEach(
							(item) => {
								//TODO support hookup when the property is an array
								let matches = _.filter(results, {[key]: item[primaryKey]});
								matches.forEach(
									function (row) {
										row.foreignKeys = row.foreignKeys || {};
										row.foreignKeys[key] = item;
									}
								)
							}
						)
					}
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
