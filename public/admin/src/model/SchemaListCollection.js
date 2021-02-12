import Backbone from "backbone";
import Model from "./SchemaListModel";

default export class SchemaListCollection extends Backbone.Collection{

	get model() {
		return Model;
	}

	get url() {
		return "/admin/schema-list";
	}

	parse(data) {
		return data.results;
	}
}
