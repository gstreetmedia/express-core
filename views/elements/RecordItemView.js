const inflector = require("../../helper/inflector");
const getView = require("../../helper/view/get-view");
const numeral = require("numeral");
const moment = require("moment");
const beautify = require("json-beautify");
const _ = require("lodash");

class RecordItemView {

	constructor(model) {
		this.model = model;
	}

	getInstance(model, key) {
		let k = "_instance_" + model.tableName + "_" + key;
		if (!this[k]) {
			this[k] = key + "_" + Math.round(Math.random()*10000);
		}
		return this[k];
	}

	jsonView(model, key, data) {
		let value = data[key];
		//JSON View
		return `
        <div class="col-12"></div>
        <label class="label col-md-2 mb-2">${ key }</label>
        <div class="col-md-10 mb-2">
            <div class="card">
                <script>
                    var ${ this.getInstance(model, key) } = ${ JSON.stringify(value) };
                </script>
                <div class="card-body" data-json-view="${ this.getInstance(model, key) }">
                </div>
            </div>
        </div>`
	}

	textView(model, key, data) {

		let value = data[key];
		return `
        <label class="label col-md-2 mb-2">${ inflector.classify(inflector.underscore(key)) }</label>
        <div class="col-md-4 mb-2">
            <div class="form-control"
                 style="height: auto;min-height: 40px;overflow: hidden;text-overflow: ellipsis">
                ${ key === "url" ? `<img src="${ value }" class="w-100" alt="" />` : ''}
                ${ value }
            </div>
        </div>
`
	}

	doValue (model, key, data) {
		let value = data[key];
		if (key.indexOf(".")) {
			value = _.get(data, key);
		}
		let tableName;
		if (data.foreignKeys && data.foreignKeys[key]) {
			let fkValue = data.foreignKeys[key];
			let modelClass = model.foreignKeys[key].model || model.foreignKeys[key].modelClass;
			let foreignKeyModel = model.loadModel(modelClass);
			foreignKeyModel = new foreignKeyModel();
			foreignKeyModel.init();
			tableName = foreignKeyModel.tableName;
			let nameField = foreignKeyModel.name || "name";
			let name;
			if (nameField.indexOf(".") !== -1) {
				name = _.get(fkValue, nameField);
			} else {
				name = fkValue[nameField];
			}

			if (name) {
				let q = JSON.stringify({where:{[foreignKeyModel.primaryKey]:{"in":[data.foreignKeys[key][foreignKeyModel.primaryKey]]}}}).split('"').join('&quot;')
				return `
            <a href="/admin/${tableName}?query=${q}" title="${value}" 
                data-title="${foreignKeyModel.schema.title}"
                data-table-name="${foreignKeyModel.tableName}"
                data-id="${data.foreignKeys[key][foreignKeyModel.primaryKey]}"
                target="_blank"
            >
                ${name}
            </a>`
			} else {
				return this.valueRender(model, key, value, name)
			}
		} else if (key === model.primaryKey) {
			let q = JSON.stringify({where:{[model.primaryKey]:{"in":[data[key]]}}}).split('"').join('&quot;')
			return `
			<a href="/admin/${model.tableName}?query=${q}" title="${value}" 
                data-title="${model.schema.title}"
                data-table-name="${model.tableName}"
                data-id="${data[key]}"
                target="_blank"
            >${data[key]}</a>`
		} else {
			return this.valueRender(model, key, value)
		}
	}

	valueRender(model, key, value, name) {

		if (typeof this[key] === "function") {
			return this[key](model, key, value);
		}

		let properties = model.schema.properties;


		if (!value) {
			return "";
		}

		if (!properties[key]) {
			return value;
		}

		if (!model) {
			console.log("Missing model");
			return value;
		}

		return value;

		switch (properties[key].type) {
			case "number" :
				if (model.schema.primaryKey !== key) {
					value = numeral(value).format();
				}
				break;
			case "object" :
				value = beautify(value, null, 2, 80);
				break;
			case "boolean" :
				return value===true ? '<i class="material-icons text-success">done</i>' :
					'<i class="material-icons text-danger">block</i>';
				break;
			case "array" :
				value = beautify(value, null, 2, 80).split(",").join('<br/>');
				break;
			default :
				if (properties[key].format) {
					switch (properties[key].format) {
						case "date-time" :
							try {
								value = moment(value).utc().format("MM/DD/YY - HH:mm");
							} catch (e) {

							}
							break;
						case "date" :
							try {
								value = moment(value).utc().format("MM/DD/YY");
							} catch (e) {

							}
							break;
						case "uuid" :

					}
				} else {
					if (_.isObject(value)) {
						if (value.name) {
							value = value.name;
						} else if (value.firstName) {
							if (value.lastName) {
								value = value.firstName + " " + value.lastName;
							}
						} else {
							value = JSON.stringify(value)
						}
					}
				}
		}

		if (name) {
			return `<span title="${key + ": " + value}" data-toggle="tooltip" data-placement="bottom">${name}</span>`
		}

		return value;
	}

	render(model, key, data, is) {
		let value = data[key];
		if (_.isObject(value) && !_.isDate(value)) {
			return this.jsonView(model, key, data)
		}
		if (_.isObject(value) && !_.isDate(value)) {
			return this.jsonView(model, key, data)
		}
		if (model.schema.properties[key] && model.schema.properties[key].maxLength && model.schema.properties[key].maxLength > 1000) {
			return this.textView(model, key, data);
		}
		return `
		<label class="label col-md-2 mb-2">${ key }</label>
        <div class="col-md-4 mb-2">
            <div class="form-control"
                 style="height: auto;min-height: 40px;overflow: hidden;text-overflow: ellipsis">
                ${this.doValue(model, key, data)}
            </div>
        </div>`

	}
}

module.exports = RecordItemView;
