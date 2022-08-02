const QueryBase = require("./QueryToSqlBase");
const _ = require("lodash");
const sqlString = require("sqlstring");

class QueryBuilder {

	constructor(schema) {
		this.schema = schema;
		this.body = {
			query : {
				$or : [

				],
				$and : [

				]
			},
			limit : null,
			skip : 0,
			sort : [],
			filter : []
		}
	}

	select(key) {
		this.body.filter.push(key);
		this.action = "select";
	}

	update(data) {
		this.action = "update";
		if (this.data)
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
		this.body.limit = count;
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
		this.body.skip = offset;
	}

	equals(obj, property) {
		this.body[Object.keys(obj)[0]] = obj[Object.keys(obj)][0];
	}

	and(obj, property) {
		this.body.$and.push(obj);
	}

	or(obj, property) {
		this.body.$or.push(obj);
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
			if(!this.properties[sourceKey]) {
				return;
			}
			property = this.properties[sourceKey];
			columnName = key;
		} else {
			property = this.properties[key];
			columnName = key;
		}

		if (!property && key !== "and" && key !== "or") {
			return;
		}

		let target;

		switch (group) {
			case "or" :
				target = qb.or;
				break;
			case "and" :
				target = qb.or;
				break;
			default :
				target = qb.and;
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
				target({[columnName]: {$gt : this.processType(value, property)}}, property);
				break;
			case "gte" :
			case ">=" :
				target({[columnName]: {$gte : this.processType(value, property)}}, property);
				break;
			case "lt" :
			case "<" :
				target({[columnName]: {$lt : this.processType(value, property)}}, property);
				break;
			case "lte" :
			case "<=" :
				target({[columnName]: {$lte : this.processType(value, property)}}, property);
				break;
			case "in" :
				target({[columnName]:  {$in : this.processType(value, property)}}, property);
				break;
			case "nin" :
				target({[columnName]: {$nin : this.processType(value, property)}}, property);
				break;
			case "endsWith" :
				target({[columnName]: {$regex : value + "$"}}, property);
				break;
			case "startsWith" :
				target({[columnName]: {$regex : "^" + value}}, property);
				break;
			case "contains" :
			case "like" :
				target({[columnName]: {$regex : value}}, property);
				break;
			case "exists" :
				target({[columnName]: {$exists : true}}, property);
				break;
			case "notExists" :
				target({[columnName]: {$exists : false}}, property);
				break;
			case "!" :
			case "!=" :
			case "ne" :
				if (value === null) {
					target({[columnName]: {$ne : null}}, property);
				} else if (Array.isArray(value)) {
					target({[columnName]: {$ne : value}}, property);
				} else {
					target({[columnName]: {$ne : value}}, property);
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
		//TODO recurse properties[item[0]].properties[item[1]] when "." is present
		if (this.properties[propertyName]) {
			return this.properties[propertyName].columnName;
		}
		return null;
	}

	buildSelect(key, subKey) {
		return this.properties[key].columnName
	}

	processType(value, property) {
		let v;
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
		//TODO recurse properties[item[0]].properties[item[1]] when "." is present
		if (this.properties.hasOwnProperty(item)) {
			return item;
		}
	}

}

module.exports = QueryToElastic;
