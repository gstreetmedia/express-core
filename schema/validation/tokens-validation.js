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
	key:{
		validate: (key, data, schema)=> {
			return validator.isUUID(data[key]);
		},
		default:null
	},
	secret:{
		validate: (key, data, schema)=> {
			return validator.isUUID(data[key]);
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
	configId:{
		validate: (key, data, schema)=> {
			return validator.isUUID(data[key]);
		},
		default:null
	},
};

module.exports = validation;