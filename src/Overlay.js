import React, { Component } from "react";
import './Overlay.css'

class Overlay extends Component {
	constructor() {
		super();
		this.state = { classes: 'visible' };
	}
	componentDidMount() {
		setTimeout(() => this.setState({ classes: 'hidden' }), 200);
	}
	render() {
		const { classes } = this.state;
    	return <div id='overlayDiv' className={classes}>DRIP</div>;
	  }
}
export default Overlay