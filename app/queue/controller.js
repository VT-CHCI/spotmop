
angular.module('spotmop.queue', [
    'ngRoute'
])

/**
 * Every controller start with defining its own routes.
 */
.config(function($routeProvider) {
    $routeProvider.when("/queue", {
        templateUrl: "app/queue/template.html",
        controller: "QueueController"
    });
})
	
.controller('QueueController', function QueueController( $scope, $rootScope, $route, $timeout, MopidyService ){
	
	$scope.tracks = [];
	$scope.totalTime = 0;
	$scope.currentTlTrack = {};
	
	$scope.$on('spotmop:currentTrackChanged', function( event, tlTrack ){
		updateCurrentTlTrack( tlTrack );
	});
	
	$scope.$on('mopidy:event:tracklistChanged', function(){
		fetchTracklist();
	});
	
	
	/**
	 * Get new currently playing tl track
	 * TODO: Apply this to the directive that handles the currentlyPlaying switch
	 * @param tlTrack = obj (optional)
	 **/
	function updateCurrentTlTrack( tlTrack ){
	
		// we've been parsed a tlTrack, so just save it
		if( typeof( tlTrack ) !== 'undefined' ){
			$scope.currentTlTrack = tlTrack;
		
		// not provided, let's get it ourselves
		}else{
			MopidyService.getCurrentTlTrack()
				.then(
					function( tlTrack ){
						$scope.currentTlTrack = tlTrack;
						console.log( tlTrack );
					}
				);
		}
	}
	
	// get tracklist on load
	// TODO: need to figure out how to do this, without upsetting $digest
	$timeout(fetchTracklist, 1000);
	
	/**
	 * Fetch the tracklist
	 **/
	function fetchTracklist(){		
		MopidyService.getCurrentTlTracks().then( function( tracks ){			
			updateTracklist( tracks );
		});
		updateCurrentTlTrack();
	};
	
	/**
	 * Update our tracklist
	 **/
	function updateTracklist( tracks ){
		
		$scope.tracks = tracks;
		
		// figure out the total time for all tracks
		var totalTime = 0;
		$.each( $scope.tracks, function( key, track ){
			totalTime += track.track.length;
		});	
		$scope.totalTime = Math.round(totalTime / 100000);	
		
		highlightCurrentTrack();
	};
	
	/**
	 * Highlight the currently playing TlTrack
	 **/
	function highlightCurrentTrack(){
		
		/*
		THIS IS MOVED TO THE DIRECTIVE FOR TRACK
		// search each of the tracks for the tlid
		$.each( $scope.tracks, function(key, track){
		
			// if we have a match, mark it as currently playing
			if( $scope.currentTlTrack && track.tlid === $scope.currentTlTrack.tlid ){
				track.currentlyPlaying = true;
			}else{
				track.currentlyPlaying = false;
			}
		});
		*/
	}
	
	
	
	/**
	 * Delete tracks from this playlist
	 * @param tracksDOM = jQuery array of dom tracks
	 * @param tracks = json array of track info (ie {uri: "XX"});
	 **/
	$scope.deleteTracks = function( tracksDOM, tracks ){
		
		// make sure that the current controller is THIS controller
		if( $route.current.$$route.controller == 'QueueController' ){
			console.log('deleting from queue');
		}
		//console.log( tracksDOM );
	};
});