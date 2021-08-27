/**
 * @param {ModelBase} model
 * @param {string} key
 * @param {object} value
 * @returns {string}
 */
module.exports = (model, key, data) => {
    let value = data[key];
    const _ = require("lodash");
    let instance = key + "_" + Math.round(Math.random()*10000);
    let inflector = require("../../helper/inflector");
    let ValueFormat = require("../elements/ValueFormat");

    //JSON View
    if (_.isObject(value) && !_.isDate(value)) {
        return `
        <div class="col-12"></div>
        <label class="label col-md-2 mb-2">${ key }</label>
        <div class="col-md-10 mb-2">
            <div class="card">
                <script>
                    var ${ instance } = ${ JSON.stringify(value) };
                </script>
                <div class="card-body" data-json-view="${ instance }">
                </div>
            </div>
        </div>`
    }

    //Text View
    if (model.schema.properties[key] && model.schema.properties[key].maxLength && model.schema.properties[key].maxLength > 1000) {
        return `
        <label class="label col-md-2 mb-2">${ inflector.classify(inflector.underscore(key)) }</label>
        <div class="col-md-4 mb-2">
            <div class="form-control"
                 style="height: auto;min-height: 40px;overflow: hidden;text-overflow: ellipsis">
                ${ key === "url" ? `<img src="${ value }" class="w-100" alt="" />` : ''}
                ${ valueFormat(model, key, value) }
            </div>
        </div>
`
    }

    let doValue = () => {
        let m = "";
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
                return `
            <a href="/admin/${tableName}/${data.foreignKeys[key][foreignKeyModel.primaryKey]}/view" title="${value}" 
                data-bindid="view"
                data-title="${foreignKeyModel.schema.title}"
                data-table-name="${foreignKeyModel.tableName}"
                data-id="${data.foreignKeys[key][foreignKeyModel.primaryKey]}"
            >
                ${name}
            </a>`
            } else {
                return valueFormat(model, key, value)
            }
        } else {
            return valueFormat(model, key, value)
        }
    }

    return `
        <label class="label col-md-2 mb-2">${ key }</label>
        <div class="col-md-4 mb-2">
            <div class="form-control"
                 style="height: auto;min-height: 40px;overflow: hidden;text-overflow: ellipsis">
                ${doValue()}
            </div>
        </div>
    `
}
