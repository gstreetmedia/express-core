import Backbone from "backbone";

default export class SchemaListModel extends Backbone.Model{

	get url() {
		return "/admin/schema-list";
	}

	parse(data) {
		return data.results;
	}
}
