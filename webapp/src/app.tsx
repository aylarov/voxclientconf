declare function require(string): string;
import $ = require('jquery');
import jQuery = require('jquery');
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as VoxImplant from 'voximplant-websdk';
import LoginForm from "./UIElements/LoginForm";
import {
	Button,
	Modal,
	Input,
	Row,
	Col,
	ListGroup,
	ListGroupItem
} from 'react-bootstrap';
import Utils from './Utils';
require('./app.scss');

enum AppViews {
	INIT,
	CONNECTED,
	AUTH,
	CONFERENCE_PARTICIPANTS,
	CONFERENCE_CALLING,
	INBOUND,
	FINISHED
}

enum CallStatuses {
	DEFAULT,
	INIT,
	CONNECTED,
	STREAM_CONNECTED,
	ENDED
}

interface State {
	view: AppViews,
	tip?: String
}

class Mix {
	/**
	* AudioContext
	*/
	audioCtx: AudioContext;		
	/**
	* Audio channels merger
	*/
	merger: ChannelMergerNode;
	splitter: ChannelSplitterNode;
	/**
	* User for whom this mix is created for
	*/
	forUser: string;
	/**
	* Destination
	*/
	destination: any;
	/**
	* Participants whos steams were already added to the mix
	*/
	pariticipants: string[];
	host: boolean;

	constructor(for_user: string, localstream: MediaStream, audiocontext: AudioContext, host: boolean = false) {
		this.audioCtx = audiocontext;
		this.pariticipants = [];
		this.forUser = for_user;		
		this.merger = this.audioCtx.createChannelMerger();
		this.host = host;
		if (!host) {
			this.destination = this.audioCtx.createMediaStreamDestination();
		} else {		
			console.log("Send local mix to audio device");	
			this.destination = this.audioCtx.destination;
			//this.merger.connect(this.destination);
		}
		if (!host) {
			this.audioCtx.createMediaStreamSource(localstream).connect(this.merger, 0, 0);
			this.audioCtx.createMediaStreamSource(localstream).connect(this.merger, 0, 1);
		}
		console.log("MIX[" + this.forUser + "] created");
	}

	addParticipant(name: string, mediastream: MediaStream) {
		let found: boolean = false;
		for (let i = 0; i < this.pariticipants.length; i++) {
			if (this.pariticipants[i] == name) {
				found = true;
				break;
			}
		}
		if (!found) {
			let source: MediaStreamAudioSourceNode = this.audioCtx.createMediaStreamSource(mediastream);
			source.connect(this.merger, 0, 0);
			source.connect(this.merger, 0, 1);
			this.pariticipants.push(name);
			console.log("MIX[" + this.forUser + "] mediastreams:");
			console.log(this.pariticipants);
		}
	}

	getResultStream() {		
		this.merger.connect(this.destination);
		return this.destination.stream;
	}

}

class App extends React.Component<any, any> {

	// SDK instance
	voxAPI: VoxImplant.Client;

	// Account info
	displayName: string;
	username: string;
	appname: string = YOUR_VOX_APPNAME;
	accname: string = YOUR_VOX_ACCNAME;
	
	// Roster data
	roster: VoxImplant.RosterItem[];
	presence: Object[];

	peerCalls: VoxImplant.Call[];
	mixes: Mix[];
	QueryString: Object;
	participants: Object[];

	localStream: MediaStream;
	peerStreams: MediaStream[] = [];
	host: boolean = false;
	audioCtx: AudioContext;
	calls: number = 0;
	wsURL: string = 'https://'+YOUR_DOMAIN+'/auth.php';

	state: State = {
		view: AppViews.INIT,
		tip: "Please allow access to your camera and microphone"
	}

	constructor() {
		super();
		this.QueryString = Utils.queryString();
		this.peerCalls = [];
		this.participants = [];
		this.mixes = [];
		this.audioCtx = new AudioContext();
		this.roster = [];
		this.presence = [];
		this.voxAPI = VoxImplant.getInstance();
		// Init
		this.voxAPI.addEventListener(VoxImplant.Events.SDKReady, (e: VoxImplant.Events.SDKReady) => this.voxReady(e));
		// Connection
		this.voxAPI.addEventListener(VoxImplant.Events.ConnectionEstablished, (e: VoxImplant.Events.ConnectionEstablished) => this.voxConnected(e));
		this.voxAPI.addEventListener(VoxImplant.Events.ConnectionFailed, (e: VoxImplant.Events.ConnectionFailed) => this.voxConnectionFailed(e));
		this.voxAPI.addEventListener(VoxImplant.Events.ConnectionClosed, (e: VoxImplant.Events.ConnectionClosed) => this.voxConnectionClosed(e));
		// Auth
		this.voxAPI.addEventListener(VoxImplant.Events.AuthResult, (e: VoxImplant.Events.AuthResult) => this.voxAuthEvent(e));
		// Misc 
		this.voxAPI.addEventListener(VoxImplant.Events.MicAccessResult, (e: VoxImplant.Events.MicAccessResult) => this.voxMicAccessResult(e));
		this.voxAPI.addEventListener(VoxImplant.Events.IncomingCall, (e: VoxImplant.Events.IncomingCall) => this.voxIncomingCall(e));
		// Logs
		//this.voxAPI.writeLog = function(message) { }
		//this.voxAPI.writeTrace = function(message) { }
		// IM & Presence
		this.voxAPI.addEventListener(VoxImplant.IMEvents.UCConnected, (e: VoxImplant.IMEvents.UCConnected) => this.voxUCConnected(e));
		this.voxAPI.addEventListener(VoxImplant.IMEvents.RosterReceived, (e: VoxImplant.IMEvents.RosterReceived) => this.voxRosterReceived(e));
		this.voxAPI.addEventListener(VoxImplant.IMEvents.RosterPresenceUpdate, (e: VoxImplant.IMEvents.RosterPresenceUpdate) => this.voxRosterPresenceUpdate(e));
		this.voxAPI.addEventListener(VoxImplant.IMEvents.RosterItemChange, (e: VoxImplant.IMEvents.RosterItemChange) => this.voxRosterItemChange(e));
		// Init
		this.voxAPI.init({
			micRequired: true
		});
	}

	voxReady(e: VoxImplant.Events.SDKReady) {
		console.log("VoxImplant WebSDK v. " + e.version + " ready");
		this.voxAPI.connect();
	}

	voxConnected(e: VoxImplant.Events.ConnectionEstablished) {
		console.log("Connection established");			
		this.setState({
			view: AppViews.CONNECTED
		});
	}

	voxUCConnected(e: VoxImplant.IMEvents.UCConnected) {
		console.log("UC connected");
	}

	voxRosterReceived(e: VoxImplant.IMEvents.RosterReceived) {
		this.roster = e.roster;
		this.forceUpdate();
	}

	voxRosterPresenceUpdate(e: VoxImplant.IMEvents.RosterPresenceUpdate) {
		let user: string = e.id.substr(0, e.id.indexOf('@'));
		if (e.presence == VoxImplant.UserStatuses.Offline) {
			delete (this.presence[user]);

			let index: number = -1;
			for (let i = 0; i < this.participants.length; i++) {
				if (this.participants[i]["name"] == user) {
					index = i;
					break;
				}
			}
			if (index != -1) this.participants.splice(index, 1);
				
		} else {
			this.presence[e.id] = e.presence;
		}

		this.forceUpdate();
	}

	voxRosterItemChange(e: VoxImplant.IMEvents.RosterItemChange) {
		if (e.type == VoxImplant.RosterItemEvent.Added) {
			this.roster.push({
				groups: [this.appname+"."+this.accname+".voximplant.com"],
				id: e.id,
				name: e.displayName,
				resources: [],
				subscription_type: 8
			});
		} else if (e.type == VoxImplant.RosterItemEvent.Removed) {
			let user: string = e.id.substr(0, e.id.indexOf('@'));
			let index: number = -1;
			for (let i = 0; i < this.roster.length; i++) {
				if (this.roster[i].id == user) {
					index = i;
					break;
				}
			}
			if (index != -1) this.roster.splice(index, 1);
		}
	}

	voxConnectionFailed(e: VoxImplant.Events.ConnectionFailed) {
		console.log("Connection failed");
		this.setState({
			view: AppViews.FINISHED
		});
	}

	voxConnectionClosed(e: VoxImplant.Events.ConnectionClosed) {
		console.log("Connection closed");
		this.setState({
			view: AppViews.FINISHED
		});
	}

	voxMicAccessResult(e: VoxImplant.Events.MicAccessResult) {
		console.log("Mic access " + (e.result ? "allowed" : "denied"));
		this.localStream = e.stream;
		this.setState({
			tip: "Establishing connection"
		});
	}

	voxAuthEvent(e: VoxImplant.Events.AuthResult) {
		if (e.result) {
			this.displayName = e.displayName;
			this.setState({
				view: AppViews.CONFERENCE_PARTICIPANTS
			});
		} else {
			if (e.code == 302) {
				let uid = this.username + "@" + this.appname + "." + this.accname + ".voximplant.com";
				$.get(this.wsURL + '?key=' + e.key + '&username=' + this.username, function(data) {
					if (data != "NO_DATA") {
						this.voxAPI.loginWithOneTimeKey(uid, data);
					}
				}.bind(this));
			} else {
				console.log("auth failed");
			}
		}
	}

	authorize(displayName: string) {
		this.displayName = displayName;
		this.setState({
			view: AppViews.AUTH,
			tip: "Authorizing"
		});

		$.get(this.wsURL + '?action=JOIN_CONFERENCE&displayName=' + this.displayName, function(data) {
			try {
				let result = JSON.parse(data);
				if (typeof result.username != "undefined") {
					// Login
					console.log(result);
					this.username = result.username;
					this.voxAPI.requestOneTimeLoginKey(this.username + "@" + this.appname + "." + this.accname + ".voximplant.com");
				}
			} catch (e) {
				console.log(e);
			}
		}.bind(this));

	}

	startConference() {
		this.host = true;
		for (let i = 0; i < this.participants.length; i++) {
			this.participants[i]["status"] = CallStatuses.INIT;
			let call: VoxImplant.Call = this.voxAPI.call(this.participants[i]["name"], false, null, { "X-DirectCall": "true" });
			call.addEventListener(VoxImplant.CallEvents.Connected, (e: VoxImplant.CallEvents.Connected) => this.handleCallConnected(e));
			call.addEventListener(VoxImplant.CallEvents.Disconnected, (e: VoxImplant.CallEvents.Disconnected) => this.handleCallDisconnected(e));
			call.addEventListener(VoxImplant.CallEvents.Failed, (e: VoxImplant.CallEvents.Failed) => this.handleCallFailed(e));			
			this.peerCalls.push(call);
		}
		this.mixes[this.username] = new Mix(this.username, this.localStream, this.audioCtx, this.host);		
		this.setState({
			view: AppViews.CONFERENCE_CALLING
		});
	}

	finishConference() {
		for (let i = 0; i < this.peerCalls.length; i++) {
			this.peerCalls[i].hangup();
		}
		this.setState({
			view: AppViews.FINISHED
		});
	}

	handleCallConnected(e: VoxImplant.CallEvents.Connected) {
		this.voxAPI.setCallActive(e.call, true);
		for (let i = 0; i < this.participants.length; i++) {
			if (this.participants[i]["name"] == e.call.number()) this.participants[i]["status"] = CallStatuses.CONNECTED;
		}
		this.forceUpdate();
		// Remote stream doesn't appear immediately - waiting for it
		var ts = setInterval(() => {

			if (e.call.getPeerConnection().getRemoteAudioStream() != null) {

				//(document.getElementById(e.call.getAudioElementId()) as HTMLMediaElement).volume = 0;
				//console.log(e.call.number() + ": " + e.call.getAudioElementId());

				clearInterval(ts);
				this.mixes[e.call.number()] = new Mix(e.call.number(), this.localStream, this.audioCtx);

				for (let i = 0; i < this.peerCalls.length; i++) {
					if (this.peerCalls[i].number() != e.call.number()) {
						console.log("Attaching " + this.peerCalls[i].number() + " audio stream to " + e.call.number() + " mix");
						this.mixes[e.call.number()].addParticipant(this.peerCalls[i].number(), this.peerCalls[i].getPeerConnection().getRemoteAudioStream());
					}
				}					

				e.call.getPeerConnection().setLocalStream(this.mixes[e.call.number()].getResultStream());				

				for (let i = 0; i < this.participants.length; i++) {
					if (this.participants[i]["name"] == e.call.number()) this.participants[i]["status"] = CallStatuses.STREAM_CONNECTED;
				}
				this.forceUpdate();

			}

		}, 1000);

	}

	handleCallDisconnected(e: VoxImplant.CallEvents.Disconnected) {
		for (let i = 0; i < this.participants.length; i++) {
			if (this.participants[i]["name"] == e.call.number()) this.participants[i]["status"] = CallStatuses.ENDED;
		}
		let index: number = this.peerCalls.indexOf(e.call);
		if (index > -1) this.peerCalls.splice(index, 1);
		if (this.peerCalls.length > 0) this.forceUpdate();
		else {
			this.participants = [];
			this.setState({
				view: AppViews.CONFERENCE_PARTICIPANTS
			});
		}
	}

	handleCallFailed(e: VoxImplant.CallEvents.Failed) {
		console.log("Call to " + e.call.number() + " failed");
		for (let i = 0; i < this.participants.length; i++) {
			if (this.participants[i]["name"] == e.call.number()) this.participants[i]["status"] = CallStatuses.ENDED;
		}
		let index: number = this.peerCalls.indexOf(e.call);
		if (index > -1) this.peerCalls.splice(index, 1);
		if (this.peerCalls.length > 0) this.forceUpdate();
		else this.setState({
			view: AppViews.FINISHED
		});
	}

	voxIncomingCall(e: VoxImplant.Events.IncomingCall) {
		if (this.state.view == AppViews.INBOUND || this.state.view == AppViews.CONFERENCE_CALLING) e.call.reject();
		else {
			this.setState({
				view: AppViews.INBOUND
			})
			// No need to do anything special - all magic is on the host side
			this.peerCalls.push(e.call);
			e.call.addEventListener(VoxImplant.CallEvents.Disconnected, (e: VoxImplant.CallEvents.Disconnected) => this.handleCallDisconnected(e));
			e.call.answer();
		}
	}

	mutePlayback() {
		console.log("Mute playback");
		for (let i = 0; i < this.peerCalls.length; i++ ) {
			this.peerCalls[i].mutePlayback();
		}
	}

	unmutePlayback() {
		console.log("Unmute playback");
		for (let i = 0; i < this.peerCalls.length; i++) {
			this.peerCalls[i].unmutePlayback();
		}
	}

	muteMic() {
		console.log("Mute microphone");
		for (let i = 0; i < this.peerCalls.length; i++) {
			this.peerCalls[i].muteMicrophone();
		}
	}

	unmuteMic() {
		console.log("Unmute microphone");
		for (let i = 0; i < this.peerCalls.length; i++) {
			this.peerCalls[i].unmuteMicrophone();
		}
	}

	onListItemClick(e: string) {

		let index: number = -1;
		for (let i = 0; i < this.participants.length; i++) {
			if (this.participants[i]["name"] == e.substr(0, e.indexOf('@'))) {
				index = i;
				break;
			}
		}

		if (index != -1) this.participants.splice(index, 1);
		else this.participants.push({ name: e.substr(0, e.indexOf('@')) });
		this.forceUpdate();
	}

	render() {
		if (this.state.view == AppViews.INIT || this.state.view == AppViews.AUTH) {

			return <div>
				<div className="tip">{this.state.tip}</div>
				<div className="spinner2">
					<div className="bounce1"></div>
					<div className="bounce2"></div>
					<div className="bounce3"></div>
				</div>
			</div>;

		} else if (this.state.view == AppViews.CONNECTED) {

			return <LoginForm ref="login_form" onSubmit={this.authorize.bind(this) } />;

		} else if (this.state.view == AppViews.CONFERENCE_PARTICIPANTS) {

			let button: JSX.Element,
				msg: string;
			if (this.participants.length > 0) button = <Button bsStyle="success" onClick={ () => this.startConference() }>Start</Button>;
			
			let online_users: number = 0;
			for (var i in this.presence) {
				if (this.presence[i] == VoxImplant.UserStatuses.Online) {
					online_users++;
				}
			}
			if (online_users > 0) msg = "Choose users to start the conference or wait until someone call you";
			else msg = "Nobody is online at the moment";

			/**
			* 	<Button onClick = { () => this.mutePlayback() }>Mute Playback</Button>
			*	<Button onClick = { () => this.unmutePlayback() }>Unmute Playback</Button>
			*	<Button onClick = { () => this.muteMic() }>Mute Mic</Button>
			*	<Button onClick = { () => this.unmuteMic() }>Unmute Mic</Button>
			*/

			return <div className="static-modal">
				<Modal.Dialog>
					<Modal.Header>
						<Modal.Title>Client-side Audio Conference</Modal.Title>
					</Modal.Header>

					<Modal.Body>
						<h3>Online Users</h3>
						<p>{msg}</p>
						<ListGroup fill>
							{this.roster.map(function(obj) {

								if (typeof this.presence[obj["id"]] != "undefined" &&
									this.presence[obj["id"]] == VoxImplant.UserStatuses.Online) {

									let found: boolean = false;
									for (let i = 0; i < this.participants.length; i++) {
										if (this.participants[i]["name"] == obj["id"].substr(0, obj["id"].indexOf('@'))) {
											found = true;
											break;
										}
									}
									
									if (found) return <ListGroupItem key={obj["id"]} ref={obj["id"]} onClick={ (e) => this.onListItemClick(obj["id"]) } active>{obj["name"]}</ListGroupItem>;
									else return <ListGroupItem key={obj["id"]} ref={obj["id"]} onClick={ (e) => this.onListItemClick(obj["id"]) }>{obj["name"]}</ListGroupItem>;

								}

							}.bind(this)) }
						</ListGroup>
					</Modal.Body>

					<Modal.Footer>
						{button}
					</Modal.Footer>

				</Modal.Dialog>
			</div>;
		} else if (this.state.view == AppViews.CONFERENCE_CALLING) {

			let button: JSX.Element,
				msg: string = "Calling selected users";
			if (this.participants.length > 0 && this.host) button = <Button bsStyle="danger" onClick={ () => this.finishConference() }>Finish</Button>;

			let processed_number: number = 0;
			for (let i = 0; i < this.participants.length; i++) {
				if (this.participants[i]["status"] == CallStatuses.ENDED ||
					this.participants[i]["status"] == CallStatuses.STREAM_CONNECTED) processed_number++;
			}
			if (processed_number == this.participants.length) msg = "";

			return <div className="static-modal">
				<Modal.Dialog>
					<Modal.Header>
						<Modal.Title>Client-side Audio Conference</Modal.Title>
					</Modal.Header>

					<Modal.Body>
						<h3>{processed_number != this.participants.length?"Creating conference":"Conference is live"}</h3>
						<p>{msg}</p>
						<ListGroup fill>
							{this.participants.map(function(obj) {

								let style: string,
									name: string = "";

								switch (obj["status"]) {
									case CallStatuses.INIT:
										style = "info";
										break;

									case CallStatuses.CONNECTED:
										style = "warning";
										break;

									case CallStatuses.STREAM_CONNECTED:
										style = "success";
										break;

									case CallStatuses.ENDED:
										style = "danger";
										break;
								}

								for (let i = 0; i < this.roster.length; i++) {
									if (this.roster[i].id == obj["name"]+"@"+this.appname+"."+this.accname+".voximplant.com") {
										name = this.roster[i].name;
										break;
									}
								}
								console.log(obj);
								return <ListGroupItem key={obj["name"]} ref={obj["name"]} bsStyle={style}>{name}</ListGroupItem>;
							}.bind(this)) }
						</ListGroup>
					</Modal.Body>

					<Modal.Footer>
						{button}
					</Modal.Footer>
				</Modal.Dialog>
			</div>;

		} else if (this.state.view == AppViews.INBOUND) {

			let button: JSX.Element = <Button bsStyle="danger" onClick={ () => this.finishConference() }>Finish</Button>;

			return <div className="static-modal">
				<Modal.Dialog>
					<Modal.Header>
						<Modal.Title>Client-side Audio Conference</Modal.Title>
					</Modal.Header>

					<Modal.Body>
						Connected to the conference
					</Modal.Body>

					<Modal.Footer>
						{button}
					</Modal.Footer>

				</Modal.Dialog>
			</div>;

		} else {

			return <div>Thank you!</div>;
		}
	}
}

export default App;

ReactDOM.render(<App />, document.getElementById('app'));