declare function require(string): any;

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import $ = require('jquery');
import {
	Alert,
	Button,
	Panel,
	Input
} from 'react-bootstrap';

interface Props {
	onSubmit: (displayName: string) => void;
	ref: string;
}

class LoginForm extends React.Component<Props, any> {

  constructor(props: Props) {
    super(props);
  }

  private componentDidMount() {
  	var el = this.refs["loginForm"];
  	$(el).submit(function(event) {
      let displayName = this.refs["displayName"].getValue();
      this.props.onSubmit(displayName);
  		event.preventDefault();
	  }.bind(this));
    $("#display_name_input").focus();
  }

  render() {
    return (
    	<Panel className="loginForm">
    		<form ref="loginForm">
          <Input ref="displayName" id="display_name_input" type="text" placeholder="Enter your display name..." />
          <Button bsStyle="primary" type="submit">Sign In</Button>
    		</form>
  		</Panel>	 
    );
  }
}

export default LoginForm;