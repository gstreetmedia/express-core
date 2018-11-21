let validator = require("validator");
let _ = require("lodash");

let validation = {
	id:{
		validate: (key, data, schema)=> {
			return validator.isUUID(data[key]);
		},
		default:null
	},
	userId:{
		validate: (key, data, schema)=> {
			return validator.isUUID(data[key]);
		},
		default:null
	},
	token:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	ipAddress:{
		validate: (key, data, schema)=> {
			return validator.isIP(data[key]);
		},
		default:null
	},
	userAgent:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	expiresAt:{
		validate: (key, data, schema)=> {
			if (typeof data[key] === 'string') { return true }
			return _.isDate(data[key]);
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