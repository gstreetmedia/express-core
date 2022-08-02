const QueryBase = require("./QueryToSqlBase");
const _ = require("lodash");
const sqlString = require("sqlstring");

class QueryBuilder {

	constructor() {
		this.body = {
			query : {
				bool : {
					filter : [],
					must : [],
					must_not : [],
					should : []
				}
			},
			size : null,
			from : 0,
			sort : [],
			_source : []
		}
		this.nested = {
			path : "fillIn",
			query : {
				bool : {
					filter : [],
					must : [],
					must_not : [],
					nested : [],
					should : []
				}
			}
		}
	}

	select(key) {
		this.body._source.push(key);
		this.action = "select";
	}

	update(data) {
		this.action = "update";
		this.data = data;
	}

	insert(data) {
		this.action = "insert";
		this.data = data;
	}

	delete(data) {
		this.action = "delete";
		this.data = data;
	}

	count() {
		return {

		}
	}

	limit (count) {
		this.body.size = count;
	}

	orderBy (sort) {
		let s = sort.split(" ");
		let field = s[0];
		let order = "asc";
		if (s[1]) {
			order = s[1].toLowerCase();
		}
		this.body.sort.push({[field] : order});
	}

	offset (offset) {
		this.body.from = offset;
	}

	filter(obj, property) {
		let boolTarget = this.body.query.bool.filter;
		if (property.properties) {
			let target = _.find(boolTarget, {"path" : property.columnName})
			if (!target) {
				target = _.clone(this.nested);
				target.path = property.columnName;
				target.query.bool.filter.push(obj);
				boolTarget.push(target);
			} else {
				target.query.bool.filter.push(obj);
			}
		} else {
			boolTarget.push(obj);
		}
	}

	must(obj, property) {
		let boolTarget = this.body.query.bool.must;
		if (property.properties) {
			let target = _.find(boolTarget, {"path" : property.columnName})
			if (!target) {
				target = _.clone(this.nested);
				target.path = property.columnName;
				target.query.bool.must.push(obj);
				boolTarget.push(target);
			} else {
				target.query.bool.must.push(obj);
			}
		} else {
			boolTarget.push(obj);
		}
	}

	mustNot(obj, property) {
		let boolTarget = this.body.query.bool.must_not;
		if (property.properties) {
			let target = _.find(boolTarget, {"path" : property.columnName})
			if (!target) {
				target = _.clone(this.nested);
				target.path = property.columnName;
				target.query.bool.must_not.push(obj);
				boolTarget.push(target);
			} else {
				target.query.bool.must_not.push(obj);
			}
		} else {
			boolTarget.push(obj);
		}
	}

	range(obj, property) {
		let boolTarget = this.body.query.bool.filter;
		if (property.properties) {
			let target = _.find(boolTarget, {"path" : property.columnName})
			if (!target) {
				target = _.clone(this.nested);
				target.path = property.columnName;
				target.query.bool.filter.push({range : obj});
				boolTarget.push(target);
			} else {
				target.query.bool.must_not.push({range : obj});
			}
		} else {
			boolTarget.push({range : obj});
		}
		//this.body.query.bool.filter.push();
	}

	should(obj, property) {
		let boolTarget = this.body.query.bool.should;
		if (property.properties) {
			let target = _.find(boolTarget, {"path" : property.columnName})
			if (!target) {
				target = _.clone(this.nested);
				target.path = property.columnName;
				target.query.bool.should.push({range : obj});
				boolTarget.push(target);
			} else {
				target.query.bool.should.push({range : obj});
			}
		} else {
			boolTarget.push({range : obj});
		}
	}

	toString() {
		return this;
	}

}

class QueryToElastic extends QueryBase {


	get qb() {
		return new QueryBuilder();
	}
	/**
	 *
	 * @param {string} key - the field key
	 * @param {string} compare - the comparitor, gt, >, < lt, !, != etc
	 * @param {string|array|number} value - the string, array, number, etc
	 * @param {QueryBuilder} qb
	 * @param {{filter: [], must_not: [], should: [], range: {}, must: [], wildcard: [], toString: toString, sort: [], nested: []}} qb - the current knex builder
	 * @param {string} orAnd
	 */
	async processCompare(key, compare, value, qb, group) {


		let property;
		let columnName;

		if (key.indexOf(".") !== -1) {
			let sourceKey = key.split(".")[0];
			property = this.properties[sourceKey];
			columnName = key;
		} else {
			property = this.properties[key];
			columnName = key;
		}

		console.log(columnName);

		if (!property && key !== "and" && key !== "or") {
			return;
		}

		switch (compare) {
			case "inside" :
			case "near" :
			case "radius" :
			case "poly" :
			case "geohash" :
			case "box" :
				//TODO integrate geo query functions
				break;
			case "gt" :
			case ">" :
				qb.range({[columnName]:  {"gt" : this.processType(value, property)}}, property);
				break;
			case "gte" :
			case ">=" :
				qb.range({[columnName]: {"gte" : this.processType(value, property)}}, property);
				break;
			case "lt" :
			case "<" :
				qb.range({[columnName]: {"lt" : this.processType(value, property)}}, property);
				break;
			case "lte" :
			case "<=" :
				qb.range({[columnName]: {"lte" : this.processType(value, property)}}, property);
				break;
			case "in" :
				qb.filter({terms : {[columnName] : this.processType(value, property)}}, property);
				break;
			case "nin" :
				qb.mustNot({terms : {[columnName] : this.processType(value, property)}}, property);
				break;
			case "endsWith" :
				qb.must({wildcard:{[columnName] : {"wildcard" : "*" + value}}}, property);
				break;
			case "startsWith" :
				qb.must({wildcard:{[columnName] : {"wildcard" : value + "*"}}}, property);
				break;
			case "contains" :
			case "like" :
				qb.must({wildcard:{[columnName] : {"wildcard" : "*" + value + "*"}}}, property);
				break;

			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					qb.mustNot({term : {[columnName]: null}}, property);
				} else if (Array.isArray(value)) {
					qb.mustNot({terms : {[columnName]: value}}, property);
				} else {
					qb.mustNot({term : {[columnName]: value}}, property);
				}

				break;
			case "or" :
			case "and" :
				/**
				 * or : [
				 *  {field1: val1},
				 *  {field2 {">":val2}
				 * ]
				 */

				for (let i = 0; i < value.length; i++) {
					let innerCompare = "";
					let innerValue;
					let innerKey = Object.keys(value[i])[0]; //{field:{}}

					if (value[i][innerKey] && typeof value[i][innerKey] === "object") {
						innerCompare = Object.keys(value[i][innerKey])[0];
						innerValue = value[i][innerKey][innerCompare];
					} else {
						innerCompare = "==";
						innerValue = value[i][innerKey]
					}
					console.log(innerKey + " -> " + innerCompare + " -> " +  innerValue)

					this.processCompare(innerKey, innerCompare, innerValue, qb, group);
				}
				break;
			case "=" :
			case "==" :
			case "eq" :
			default :
				if (group === "or") {
					if (value === null) {
						qb.should({term : {[columnName] : null}}, property);
					} else if (Array.isArray(value)) {
						qb.should({terms : {[columnName] : null}}, property);
					} else {
						qb.should({terms : {[columnName] : null}}, property);
					}
				} else {
					if (value === null) {
						qb.filter({term : {[columnName]: null}}, property);
					} else if (Array.isArray(value)) {
						qb.filter({terms : {[columnName]: value}}, property);
					} else {
						qb.filter({term : {[columnName]: value}}, property);
					}
				}

				break;
		}
	}

	buildSort(propertyName) {
		if (this.properties[propertyName]) {
			return this.properties[propertyName].columnName;
		}
		return null;
	}

	buildSelect(key, subKey) {
		return this.properties[key].columnName
	}

	processObjectColumn(key, compare, value, queryBuilder, isOr) {

		//console.log("processObjectColumn");

		let columnName;
		let columnFullName;
		let fieldQuery = "";
		let as = "";
		let exists = "";

		if (this.properties[key] && this.properties[key].columnName) {
			columnName = this.properties[key].columnName;
		} else {
			if (key.indexOf(".") !== -1) {
				let parts = key.split(".");
				key = parts[0];

				if (this.properties[key] && this.properties[key].columnName) {
					columnName = this.properties[key].columnName;
					as = columnName;
					columnFullName = `"${this.tableName}"."${columnName}"`;
					exists = `${columnFullName}::jsonb`;
					parts.shift();
					for (let i = 0; i < parts.length; i++) {
						if (i + 1 === parts.length) {
							fieldQuery += "->>'" + parts[i] + "'";
							exists += ` \\? '${parts[i]}'`;
						} else {
							fieldQuery += "->'" + parts[i] + "'";
							exists += ` -> '${parts[i]}'`;
						}
						as += "." + parts[i];
					}
				} else {
					console.log("no object column named " + key);
					return;
				}
			} else {
				return;
			}
		}

		let cast = "";
		let safeValue = value;
		if (typeof value === "string") {
			cast = "::text";
			safeValue = sqlString.escape(value);
		} else if (typeof value === "boolean") {
			cast = "::bool";
		} else if (typeof value === "number") {
			cast = "::numeric"
		} else if (value instanceof Array) {
			if (value.length > 0) {
				switch (typeof value[0]) {
					case "string" :
						cast = "::text";
						break;
					case "boolean" :
						cast = "::boolean";
						break;
					case "number" :
						cast = "::numeric";
						break;
				}
			}
		}

		switch (compare) {
			case "inside" :
			case "near" :
			case "radius" :
			case "poly" :
			case "geohash" :
			case "box" :
				//TODO integrate geo query functions
				break;
			case ">" :
			case ">=" :
			case "<" :
			case "<=" :
				queryBuilder[c.where](
					this.raw(
						`(${exists} AND
						(${columnFullName}${fieldQuery})${cast} ${compare} ${safeValue})`
					)
				);
				break;
			case "in" :
				queryBuilder[c.whereIn](this.raw(`(${columnFullName}${fieldQuery})${cast}`),
					this.processArrayType(value, this.properties[key]));
				break;
			case "nin" :
			case "notIn" :
				queryBuilder[c.whereNotIn](this.raw(`(${columnFullName}${fieldQuery})${cast}`),
					this.processArrayType(value, this.properties[key]));
				break;
			case "endsWith" :
			case "startsWith" :
			case "contains" :
				switch (compare) {
					case "endsWith" :
						safeValue = sqlString.escape("%" + value);
						break;
					case "startsWith" :
						safeValue = sqlString.escape(value + "%");
						break;
					case "contains" :
						safeValue = sqlString.escape("%" + value + "%");
						break;
				}
				queryBuilder[c.where](
					this.raw(
						`(${exists} AND
						${columnFullName}${fieldQuery} ilike ${safeValue})`
					)
				);
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					queryBuilder[c.where](
						this.raw(
							`(${exists} AND
							(${columnFullName}${fieldQuery})${cast} NOT NULL)`
						)
					);
				} else {
					queryBuilder[c.where](
						this.raw(
							`(
								${exists} AND 
								(${columnFullName}${fieldQuery})${cast} != ${safeValue}
							)`
						)
					);
				}
				break;
			case "or" :
			case "and" :

				isOr = compare === "or";

				queryBuilder.where(
					(builder) => {
						for (let i = 0; i < value.length; i++) {
							let innerCompare = "";
							let innerValue;
							let innerKey = Object.keys(value[i])[0];
							let innerColumnName;

							if (typeof value[i][innerKey] === "object") {
								innerCompare = Object.keys(value[i][innerKey])[0];
							}

							if (innerCompare !== "") {
								innerValue = value[i][innerKey][innerCompare];
							} else {
								innerValue = value[i][innerKey];
							}

							this.processCompare(innerKey, innerCompare, innerValue, builder, isOr);
						}
					}
				);
				break;
			case "=" :
			case "==" :
			default : // {key : value}

				if (value === null) {
					queryBuilder[c.where](
						this.raw(
							`(${exists} AND ${columnFullName}${fieldQuery} ISNULL)`
						)
					);
				} else {
					queryBuilder[c.where](
						this.raw(
							`(${exists} AND ${columnFullName}${fieldQuery} = ${safeValue})`
						)
					);
				}
				break;
		}
	}

	processType(value, property) {
		switch (property.type) {
			case "number" :
				if (property.format === "decimal") {
					value = parseInt(value);
				}
				return value;
			case "boolean" :
				return value === "1" || value === "true" || value === true;
			case "string" :
				return value;
			default :
				if (typeof value === "string") {
					return value.trim();
				}
				return value;
		}
	}

	addSelect(item) {
		if (this.properties.hasOwnProperty(item)) {
			return item;
		}
	}

	returnObject(queryBuilder) {
		return {
			queryBuilder : queryBuilder,
			statement : queryBuilder
		};
	}

}

module.exports = QueryToElastic;
