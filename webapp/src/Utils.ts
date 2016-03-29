import $ = require('jquery');

export default class Utils {
	static generateId() {
		let maximum = 999999,
			minimum = 0,
			conferenceId = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
		return conferenceId;
	}

	static getNameFromURI(uri: string) {
		if (uri.indexOf('@') != -1) uri = uri.substr(0, uri.indexOf('@'));
		uri = uri.replace("sip:", "");
		return uri;
	}

	static queryString() {
		let query_string = {},
			query = window.location.search.substring(1),
			vars = query.split("&");
		for (let i = 0; i < vars.length; i++) {
			let pair = vars[i].split("=");
			if (typeof query_string[pair[0]] === "undefined") {
				query_string[pair[0]] = pair[1];
			} else if (typeof query_string[pair[0]] === "string") {
				let arr = [query_string[pair[0]], pair[1]];
				query_string[pair[0]] = arr;
			} else {
				query_string[pair[0]].push(pair[1]);
			}
		}
		return query_string;
	}	
}