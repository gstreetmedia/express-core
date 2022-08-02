import {
	graphql,
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
} from 'graphql';

const graphql = require("graphql").graphql;
const GraphQLSchema = require("graphql").GraphQLSchema;
const GraphQLObjectType = require("graphql").GraphQLObjectType;
const GraphQLString = require("graphql").GraphQLString;
const buildSchema = require("graphql").buildSchema;


class GraphQL {
	/**
	 * @param {JsonSchema} o
	 */
	constructor(o) {
		this.o = o;
		this.schema = new GraphQLSchema();
		this.schema();
		this.query();
	}

	schema() {
		if (this._schema) {
			return this._schema;
		}
		let schema = `
		type ${this.o.className} {
			${Object.keys(this.o.properties).map((key) => {
				return `${key}: ${this.getType(this.o.properties[key])}${this.o.isRequired(key) ? '!' : ''}`
			}).join("\n")
		}
		`
		this._schema = buildSchema(schema);

		return buildSchema();
	}

	query() {

	}

	getType(key) {

	}
}

module.exports = GraphQL;
