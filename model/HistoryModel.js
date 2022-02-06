const ModelBase = require('./ModelBase');
const _ = require("lodash");
const deepObjectDiff = require("deep-object-diff");
const moment = require("moment-timezone");
class HistoryModel extends ModelBase {

	get tableName() {
		return "_history";
	}

	async create(data) {
		let before = data.before;
		let after = data.after;
		let model = data.model;

		let obj = {
			objectType : model.tableName,
			objectId : before[model.primaryKey]
		};

		if (this.req && this.req.locals) {
			if (this.req.locals.user) {
				obj.byObjectId = this.req.locals.user.id;
				obj.byObjectType = "user";
			} else if (this.req.locals.token) {
				obj.byObjectId = this.req.locals.token.id;
				obj.byObjectType = "token";
			}
		} else {
			obj.byObjectType = "system";
		}

		let keys = Object.keys(after);

		while(keys.length > 0) {
			let key = keys[0];
			let d = _.clone(obj);
			d.field = key;
			if (key === model.updatedAt || key === model.createdAt || key === "status") {
				keys.shift();
				continue;
			}
			switch (model.properties[key].type) {
				case "object" :
				case "array" :
					if (before[key] !== null && after[key] !== null) {
						if (model.properties[key].type === "object") {
							let diff = deepObjectDiff.diff(before[key], after[key]);

							if (Object.keys(diff).length > 0) {
								let b = {};
								Object.keys(diff).forEach(
									(k) => {
										if (before[key].hasOwnProperty(k)) {
											b[k] = before[key][k];
										}
									}
								)
								d.fromValue = JSON.stringify(b);
								d.toValue = JSON.stringify(diff)
							} else {
								d = null;
							}
						} else {
							if (_.difference(before[key], after[key]).length > 0) {
								d.fromValue = JSON.stringify(before[key]);
								d.toValue = JSON.stringify(after[key]);
							}
						}
					} else if (before[key] === null && after[key] !== null) {
						d.fromValue = null;
						d.toValue = JSON.stringify(after[key]);
					} else if (before[key] === null && after[key] !== null) {
						d.fromValue = JSON.stringify(before[key])
						d.toValue = null;
					} else {
						d = null;
					}
					break;
				case "string" :
				case "number" :
				default :

					switch (model.properties[key].format) {
						case "date" :
						case "date-time" :
							try {
								if (typeof before[key] === "object") {
									before[key] = before[key].toDateString();
								}
								let a = moment.tz(before[key]);
								let b = moment.tz(after[key]);

								if (a.format() !== b.format()) {
									d.fromValue = a.format();
									d.toValue = b.format();
								} else {
									d = null;
								}
							} catch (e) {
								d = null;
							}
							break;
						default	:
							if (before[key] !== after[key]) {
								d.fromValue = before[key]
								d.toValue = after[key]
							} else {
								d = null;
							}
					}

					break;

			}
			if (d) {
				await super.create(d);
			}
			keys.shift();
		}
	}


}

module.exports = HistoryModel;
