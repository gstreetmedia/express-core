var Utils = {
	/**
	 * get the data-bindid of the element
	 * @param target
	 * @param count
	 * @returns {*}
	 */
	_getBindId: (target, count) => {
		count = count || 0;
		if (count > 10) {
			return null;
		}
		count++;

		if (!"attr" in target) {
			target = $(target);
		}

		if (target.attr("data-bindid")) {
			return target.attr("data-bindid");
		} else if (target.parent()) {
			return Utils._getBindId(target.parent(), count);
		} else {
			return null;
		}
	},
	getId: (target, count) => {
		return Utils._getBindId(target, count);
	},
	/**
	 * Given any element, find the first parent element with a bindid
	 * @param target
	 * @param bindId
	 * @param count
	 * @returns {*}
	 */
	_getBoundElement: (target, bindId, count) => {
		if (!"attr" in target) {
			target = $(target);
		}

		count = count || 0;
		if (count > 10) {
			return null;
		}
		count++;

		if (target.attr("data-bindid") && target.attr('data-bindid') === bindId) {
			//console.log("Found bound element " + target.html());
			return target;
		} else if (target.parent()) {
			//console.log("Looking for bound parent");
			return Utils._getBoundElement(target.parent(), bindId, count);
		} else {
			//console.error("Could not found bound element " + bindId);
			return null;
		}
	},
	getElement: (target, bindId, count) => {
		return Utils._getBoundElement(target, bindId, count);
	}
};

module.exports = Utils;