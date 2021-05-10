const _ = require("lodash");

const loadModel = (modelName) => {
	if (typeof modelName !== "string") {
		return modelName;
	}
	global.modelCache = global.modelCache || {};
	global.modelCache[modelName] = require("../../../model/" + modelName);
	return global.modelCache[modelName];
}

/**
 * @param key
 * @param j
 */
const processWhere = (key, j)=> {
	if (relations[key].where) {
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
const processSelect = (relations, key, j) => {
	if (relations[key].select) {
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
const processExtras = (results, key, originalSelect) => {
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

module.exports = async (model, results, query) => {

	//console.log("join " + this.tableName);

	if (!model.relations && !model.foreignKeys) {
		return results;
	}

	let relations = model.relations || {};
	let foreignKeys = model.foreignKeys || {};
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

	//console.log("Before Loop");
	//console.log(join);

	let keys = Object.keys(join);

	while (keys.length > 0) {
		let key = keys[0];

		if (relations[key]) {

			if (join[key] === true) {
				join[key] = {}
			} else if (join[key] === false) {
				console.log("remove join " + key);
				keys.shift();
				continue;
			}

			let list;
			let m;
			let throughList;
			let item = relations[key];
			let originalSelect = item.join.select ? _.clone(item.join.select) : null;
			let joinFrom = item.join.from;
			let joinTo = item.join.to;
			let joinThroughFrom = item.join.through ? item.join.through.from : null;
			let joinThroughTo = item.join.through ? item.join.through.to : null;
			let joinThroughWhere = item.join.through ? item.join.through.where : null;
			let joinThroughSort = item.join.through ? item.join.through.sort : null;

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

			///console.log("!!!!!!!!!!!!!!!!TargetKeys => " + targetKeys);
			//console.log("joinFrom => " + joinFrom);
			//console.log("joinThroughTo => " + joinThroughTo);
			//console.log("joinThroughFrom => " + joinThroughFrom);
			//console.log("joinTo => " + joinTo);

			if (item.throughClass) { //build new targetKey based on the pivot table
				const ThroughModel = loadModel(item.throughClass);
				let throughModel = new ThroughModel(model.req);
				let joinThrough = _.clone(join[key]);
				joinThrough.where = joinThroughWhere || {};
				//joinThrough.where[joinThroughFrom] = {in: targetKeys};
				joinThrough.select = [joinThroughFrom, joinThroughTo];
				joinThrough.sort = joinThroughSort || null;
				joinThrough.sql = item.join.through.sql || null;
				if (joinThrough.debug) {
					throughModel.debug = true;
				}
				let tk = [].concat(targetKeys);
				throughList = [];
				//Be Kind, Don't do too many ins at once
				while(tk.length > 0) {
					let currentKeys = tk.slice(0, Math.min(tk.length, process.env.CORE_MODEL_MAX_JOINS || 500));
					joinThrough.where[joinThroughFrom] = {in: currentKeys};
					let r = await throughModel.query(joinThrough);
					if (r.error) {
						keys.shift();
						continue;
					}
					throughList = throughList.concat(r);
					tk.splice(0, currentKeys.length);
				}

				if (throughList.length === 0) {
					keys.shift();
					continue;
				}
				targetKeys = _.uniq(_.map(throughList, joinThroughTo));
				targetKeys = _.flatten(targetKeys);
				targetKeys = _.uniq(targetKeys);
				//console.log("!!!!!!!!!!!!!!!!Target Table => " + throughModel.tableName);
				//console.log(targetKeys);

			}

			let j = _.clone(join[key]);
			//keep a copy so we can clean out non selected props


			switch (item.relation) {

				case "HasOne":

					console.log("HasOne " + key);

					let HasOneModel = loadModel(item.modelClass);
					let hasOneModel = new HasOneModel(model.req);

					if (j.debug) {
						hasOneModel.debug = true;
					}

					if (relations[key].where) {
						processWhere(key, j);
					}

					j.where = j.where || {};
					j.sort = j.sort || null;
					j.limit = j.limit || relations[key].limit || targetKeys.length;
					j.sql = relations[key].sql || null;

					if (fullJoin) {
						j.join = "*"
					}

					if (!originalSelect || originalSelect.length === 0) {
						processSelect(relations, key, j);
					}

					if (j.select && _.indexOf(j.select, joinTo) === -1) {
						j.select.push(joinTo);
						removeJoinTo = true;
					}

					list = [];
					while(targetKeys.length > 0) {
						let currentKeys = targetKeys.slice(0, Math.min(targetKeys.length, process.env.CORE_MODEL_MAX_JOINS || 500));
						j.where[joinTo] = {in: currentKeys};
						let r = await hasOneModel.query(j);
						if (r.error) {
							keys.shift();
							continue;
						}
						if (r.length > 0) {
							list = list.concat(r);
						}
						targetKeys.splice(0, currentKeys.length);
					}

					if (item.throughClass) {
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
								);
								throughItems.forEach(
									function(throughItem) {
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
											console.log("join through error " + item.throughClass);
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

					processExtras(results, key, originalSelect);

					break;
				case "HasMany" :

					console.log("HasMany " + key);

					let HasManyModel = loadModel(item.modelClass);
					let hasManyModel = new HasManyModel(model.req);

					if (j.debug) {
						hasManyModel.debug = true;
					}

					if (relations[key].where) {
						processWhere(key, j);
					}

					j.where = j.where || {};
					if (joinFromKeys) {

					}

					//TODO if targetKeys Exceed 500??


					j.sort = relations[key].sort || null;
					j.offset = relations[key].offset || 0;
					j.limit = j.limit || relations[key].limit || null;
					j.sql = relations[key].sql || null;

					if (!originalSelect || originalSelect.length === 0) {
						processSelect(relations, key, j);
					}

					//must select the targetJoin key
					if (j.select && _.indexOf(j.select, joinTo) === -1) {
						removeJoinTo = true;
						j.select.push(joinTo);
					}

					if (fullJoin) {
						j.join = "*"
					}

					j.sql = relations[key].sql;

					list = [];

					//Be Kind, Don't do too many ins at once
					while(targetKeys.length > 0) {
						let currentKeys = targetKeys.slice(0, Math.min(targetKeys.length, process.env.CORE_MODEL_MAX_JOINS || 500));
						console.log("currentKeys.length => " + targetKeys.length);
						j.where[joinTo] = {in: currentKeys};
						let r = await hasManyModel.query(j);
						if (r.error) {
							console.log(r);
							keys.shift();
							break;
						}
						if (r.length > 0) {
							console.log("r.length => " + r.length);
							list = list.concat(r);
						}
						targetKeys.splice(0, currentKeys.length);
						console.log("targetKeys.length => " + targetKeys.length);
					}

					//console.log("condition 2 "  + model.tableName);
					//console.log("hasManyModel.tableName " + hasManyModel.tableName);
					//console.log(j);

					if (model.debug) {
						console.log("list length -> " + list.length);
						console.log(j);
					}

					if (item.throughClass) {
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
										let filter = {[item.join.to]:row[item.join.to]};
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

					processExtras(results, key, originalSelect);

					break;
			}
		} else if (foreignKeys[key]) {

			//console.log("!!!!!!!!!!!!!!!!foreignKeys => " + key);

			let j = _.clone(foreignKeys[key]);

			let ForeignKeyModel = loadModel(foreignKeys[key].modelClass);
			if (!ForeignKeyModel) {
				console.warn("Foreign Key Join Error. " + key + " does not exist");
			}
			let foreignKeyModel = new ForeignKeyModel(model.req);
			if (join[key].debug || foreignKeys[key].debug) {
				foreignKeyModel.debug = true;
			}

			let idList = [];
			results.forEach(
				function (item) {
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
						function (item) {
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

	//console.log("join complete " + model.tableName);

	if (findOne) {
		return results[0];
	}

	return results;
}
