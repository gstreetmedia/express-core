class ErrorObject {

	constructor(obj) {
		this.obj = obj || {
			message : "",
			statusCode : 500
		}
		if (!this.obj.statusCode) {
			this.obj.statusCode = 500;
		}
	}

	/**
	 * @returns {string}
	 */
	get message() {
		return this.obj.message;
	}

	/**
	 * @param {string|object} value
	 */
	set message(value) {
		this.obj.message = value;
	}

	/**
	 * @param {number} value
	 */
	set statusCode(value) {
		this.obj.statusCode = value;
	}
	/**
	 * @returns {number}
	 */
	get statusCode() {
		return this.obj.statusCode;
	}

	/**
	 * @param {string} key
	 * @param {string|object} value
	 */
	setKey(key, value) {
		this.obj[key] = value;
	}

	/**
	 * @param key
	 * @returns {*}
	 */
	getKey(key) {
		return this.obj[key];
	}

	get error() {
		return this.obj;
	}

	/**
	 * @returns {*|{message: string, statusCode: number}}
	 */
	toJSON() {
		return this.obj;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return JSON.stringify(this.obj);
	}
}

module.exports = ErrorObject;
