<?php
header("Access-Control-Allow-Origin: *");
/**
* VoxImplant HTTP API access info
*/
define("API_URL", "https://api.voximplant.com/platform_api/");
define("API_KEY", YOUR_API_KEY);
define("ACCOUNT_NAME", YOUR_ACCOUNT_NAME);
/**
* Some default user password
*/
define("PWD", SOME_PASSWORD);
/**
* Application name
*/
define("APP_NAME", APP_NAME);

/**
* Generate random username
* @param {String} random_string_length Username length
*/
function generateUsername($random_string_length) {
	$characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
	$string = '';
	for ($i = 0; $i < $random_string_length; $i++) {
	  $string .= $characters[rand(0, strlen($characters) - 1)];
	}
	return $string;
}

/**
* Make HTTP request using CURL
*/
function httpRequest($url,$params = array()) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);	
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
	if (isset($params["post"])) curl_setopt($ch, CURLOPT_POST, 1);
	if (isset($params["post_data"])) curl_setopt($ch, CURLOPT_POSTFIELDS, $params["post_data"]);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$server_output = curl_exec ($ch);
	curl_close ($ch);
	return $server_output;
}

/**
* Get phone number connected to the conference for inbound calls processing
*/
function getAccessNumber() {

}

/**
* Create user for video conference
*/ 
function createUser($displayName = "Participant") {
	$username = generateUsername(10);
	$url = API_URL . "AddUser/?" . 
			"account_name=" . ACCOUNT_NAME .
			"&api_key=" . API_KEY . 
			"&user_name=" . $username .
			"&user_display_name=" . $displayName .  
			"&user_password=" . PWD;

	$result = httpRequest($url);
	return array('api_result' => json_decode($result, true), 'username' => $username);
}

/**
* Bind user to the application
*/
function bindUser($username) {

	$url = API_URL . "BindUser/?" . 
			"account_name=" . ACCOUNT_NAME .
			"&api_key=" . API_KEY . 
			"&user_name=" . $username .
			"&application_name=" . APP_NAME;

	$result = httpRequest($url);
	return array('api_result' => json_decode($result, true), 'username' => $username);
}

/**
* Create user, bind it to the app and return username
*/
function initUser($displayName) {

	$create_result = createUser($displayName);
	if ($create_result['api_result']['result'] == 1) {
		$bind_result = bindUser($create_result['username']);
		if ($bind_result['api_result']['result'] == 1) {
			echo json_encode(array("result" => "SUCCESS", "username" => $bind_result["username"]));
			exit;
		} else {
			echo json_encode(array("result" => "ERROR"));
			exit;
		}

	} else {
		echo json_encode(array("result" => "ERROR"));
		exit;
	}	

}

/**
* Calculate hash for VoxImplant loginWithOneTimeKey
*/
function calculateHash($key, $username) {
	$hash = md5($key . "|" . md5($username . ":voximplant.com:" . PWD));
	return $hash;
}

if (isset($_REQUEST['key']) && isset($_REQUEST['username'])) {
	$result = calculateHash($_REQUEST['key'], $_REQUEST['username']);
	echo $result;
	exit;
} else if (isset($_REQUEST['action'])) {
	$action = $_REQUEST['action'];
	if (isset($_REQUEST['displayName'])) $displayName = urlencode($_REQUEST['displayName']);
	else $displayName = "Participant";
	switch($action) {
		case "JOIN_CONFERENCE":
			// Create user via API and return his name to SDK for login
			initUser($displayName);			
		break;
	}
} else {
	echo "NO_DATA";
	exit;
}

?>