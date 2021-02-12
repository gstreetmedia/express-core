import React from "react";
import {Button} from "@material-ui/core";

export default class ButtonList extends React.Component {

	constructor(props) {
		super(props);
		this.state = props;
	}

	render() {
		return (
		<div>{this.state.list.map(
			(item) => {
				return <Button variant="contained" color="primary" disableElevation>{item}</Button>
			}
		)}
		</div>
		)
	}
}
