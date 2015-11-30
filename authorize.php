<?php

// allow cross-domain requests
header("Access-Control-Allow-Origin: *");

$url = 'http://music.james/authorize.php';

if( isset($_GET['app']) )
	setcookie( 'spotmop_app', $_GET['app'], time()+3600 );


echo '<h1>Authorization frame</h1>';
echo '<p>If you\'re seeing this, you\'re doing it wrong</p>';




/* ================================================================================= INIT ================ */
/* ======================================================================================================= */

// we've just completed authorization, now create credentials (access_token, etc)
if( isset($_GET['code']) ){
	
	echo 'Fetching credentials...<br />';
	
	$script = 'parent.postMessage("Stuff", "*")';	
	echo '<script type="text/javascript">'.$script.'</script>';
	
	// go get our credentials
	$response = getToken( $_GET['code'], $url );	
	$responseArray = json_decode( $response, true );
	
	// make sure we have a successful response
	if( !isset($responseArray['access_token']) ){
		echo 'Error!';
		die();
	}
	
	// send our data back to Spotmop
	?>	
		<script type="text/javascript">
			console.log('sending data');
			console.log (window.opener);
			window.opener.postMessage( '<?php echo $response ?>', "*");		
		</script>
	<?php
	
// fresh authentication, so let's get one
}else if( isset($_GET['test']) ){
		
	
	// send our data back to Spotmop
	?>	
		<script type="text/javascript">
		
			setInterval(function(){		
				var data = {
					authorizationCode: "ddsasdfasdf",
					accessToken: "ddsasdfasdf",
					refreshToken: "ddsasdfasdf",
				};
				console.log('sending');
				window.opener.postMessage(data,"*");	
			},1000);	
		</script>
	<?php
		
// fresh authentication, so let's get one
}else{

	echo 'Authorizing instance...<br />';
	getAuthorizationCode( $url );
}





/* ================================================================================= GETTERS ============= */
/* ======================================================================================================= */



/**
 * Acquire an authorization code.
 *
 * This is what connects an account's authorization for this app to use their account 
 * for future tokens and queries. Redirects to Spotify.
 * @param $url = redirect url (this script)
*/
function getAuthorizationCode( $url ){
	
	$popup = 'https://accounts.spotify.com/authorize?client_id=a87fb4dbed30475b8cec38523dff53e2&redirect_uri='.$url.'&scope=playlist-modify-private%20playlist-modify-public%20playlist-read-private%20playlist-modify-private%20user-library-read%20user-library-modify%20user-follow-modify&response_type=code&show_dialog=true';
	
	//$popup = 'http://music.james/authorize.php?test=1';
	
	?>
		<script tye="text/javascript">
			var spotmopWindow = window.open("<?php echo $popup ?>","spotmop","height=550,width=400");
			window.addEventListener('message', function(event){
				if( event.origin !== "<?php echo $_COOKIE['spotmop_app'] ?>" )
					return false;
					
				var data = event.data;
				console.log(data);
			}, false);
		</script>
	<?php
}

/*
 * Get a new access token
 * Creates a request to Spotify, which returns a new access_token, refresh_token and token_expiry object
 * @param $code = string
 * @param $url = redirect url (this script)
*/
function getToken( $code, $url ){
	
	$ch = curl_init();

	if (FALSE === $ch)
		throw new Exception('Failed to initialize');
		
	$post_data = array(
			'client_id' => 'a87fb4dbed30475b8cec38523dff53e2',
			'client_secret' => 'd7c89d0753ef4068bba1678c6cf26ed6',
			'grant_type' => 'authorization_code',
			'code' => $code,
			'redirect_uri' => $url
		);
	
	curl_setopt($ch, CURLOPT_URL,"https://accounts.spotify.com/api/token");
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
	curl_setopt($ch, CURLINFO_HEADER_OUT, true);
	curl_setopt($ch, CURLOPT_VERBOSE, true);
	curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	
	$response = curl_exec($ch);
	
	if(curl_errno($ch)){
		echo 'CURL Error: '. curl_error($ch);
	}
	
	curl_close($ch);
	
	return $response;
}




