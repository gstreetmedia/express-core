import React from "react";
import {List, ListItem, ListItemText} from "@material-ui/core";

default export class SchemaList extends React.Component {
	constructor(props) {
		super(props);
		this.state = props;
		this.handleChange = this.handleChange.bind(this);
	}

	handleChange() {
		this.forceUpdate()
	}

	render() {
		return (
			<div>
				this.
			</div>
		)
	}
}
