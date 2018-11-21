let validator = require("validator");
let _ = require("lodash");

let validation = {
	id:{
		validate: (key, data, schema)=> {
			return validator.isUUID(data[key]);
		},
		default:null
	},
	name:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	settings:{
		validate: (key, data, schema)=> {
			return _.isObject(data[key]);
		},
		default:null
	},
	createdAt:{
		validate: (key, data, schema)=> {
			if (typeof data[key] === 'string') { return true }
			return _.isDate(data[key]);
		},
		default:null
	},
	updatedAt:{
		validate: (key, data, schema)=> {
			if (typeof data[key] === 'string') { return true }
			return _.isDate(data[key]);
		},
		default:null
	},
};

module.exports = validation;