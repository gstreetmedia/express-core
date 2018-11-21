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
	firstName:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	lastName:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	username:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	email:{
		validate: (key, data, schema)=> {
			return validator.isEmail(data[key]);
		},
		default:null
	},
	password:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	role:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	status:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	emailProofToken:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	emailProofTokenExpiresAt:{
		validate: (key, data, schema)=> {
			if (typeof data[key] === 'string') { return true }
			return _.isDate(data[key]);
		},
		default:null
	},
	emailStatus:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	emailChangeCandidate:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	passwordResetToken:{
		validate: (key, data, schema)=> {
			return _.isString(data[key]);
		},
		default:null
	},
	passwordResetTokenExpiresAt:{
		validate: (key, data, schema)=> {
			if (typeof data[key] === 'string') { return true }
			return _.isDate(data[key]);
		},
		default:null
	},
	lastLoginAt:{
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