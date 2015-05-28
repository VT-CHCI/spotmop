

/* =========================================================================== INIT =========== */
/* ============================================================================================ */

// create our application
angular.module('spotmop', [
	
	// list all our required dependencies
	'ngRoute',
	'ngResource',
	'ngStorage',
	
	'spotmop.player',
	
	'spotmop.services.settings',
	'spotmop.services.mopidy',
	'spotmop.services.spotify',
	
	'spotmop.queue',
	'spotmop.settings',
	'spotmop.playlists',
	'spotmop.search',
	
	'spotmop.browse.artist',
	'spotmop.browse.album',
	'spotmop.browse.playlist',
    'spotmop.browse.user',
	'spotmop.browse.tracklist',
	
	'spotmop.discover',
	'spotmop.discover.featured',
	'spotmop.discover.new'
])


/* =========================================================================== ROUTING ======== */
/* ============================================================================================ */

// setup all the pages we require
.config(function($locationProvider, $routeProvider) {
	
	// use the HTML5 History API
	$locationProvider.html5Mode(true);
})

// setup a filter to convert MS to MM:SS
.filter('formatMilliseconds', function() {
	return function(ms) {
		var seconds = Math.floor((ms / 1000) % 60);
		if( seconds <= 9 )
			seconds = '0'+seconds;
		var minutes = Math.floor((ms / (60 * 1000)) % 60);
		return minutes + ":" + seconds;
	}
})


/**
 * Global controller
 **/
.controller('ApplicationController', function ApplicationController( $scope, $rootScope, $route, $routeParams, $localStorage, $timeout, $location, SpotifyService, MopidyService, SettingsService ){

	$scope.currentTlTrack = {};
	$scope.currentTracklist = [];
	$scope.spotifyUser = {};
    
	/**
	 * Search
	 **/
	$scope.searchSubmit = function( query ){
		$location.path( '/search/'+query );
	};

	
	/**
	 * Playlists sidebar menus
	 **/
	$scope.playlists = [];
	var getPlaylists = function(){
		return $scope.playlists;
	};
	var setPlaylists = function( playlists ){
		$scope.playlists = playlists;
	};
	
	
	/**
	 * Build main menu
	 **/
	$scope.mainMenu = [
		{
			Title: 'Queue',
			Link: 'queue',
			Icon: 'list',
			Type: 'queue',
			Droppable: true
		},
		{
			Title: 'Discover',
			Link: 'discover',
			Icon: 'star',
			Children: [
				{ 
					Title: 'Featured playlists',
					Link: 'discover/featured'
				},
				{ 
					Title: 'New releases',
					Link: 'discover/new'
				}
			]
		},
		{
			Title: 'Playlists',
			Link: 'playlists',
			Icon: 'folder-open',
			Children: null
		},
		{
			Title: 'Settings',
			Link: 'settings',
			Icon: 'cog'
		}
	];

	$scope.$on('mopidy:state:online', function(){
		$rootScope.mopidyOnline = true;		
		MopidyService.getCurrentTlTracks().then( function( tlTracks ){			
			$scope.currentTracklist = tlTracks;
		});
	});
	
	$scope.$on('mopidy:state:offline', function(){
		$rootScope.mopidyOnline = false;
	});
	
	// the page content has been updated
	$scope.$on('spotmop:pageUpdated', function(){
		
		// wait for $digest
		$timeout( function(){
			
			// make all the square panels really square
			$(document).find('.square-panel').each( function(index, value){
				$(value).find('.image-container').css('height', $(value).find('.image-container').outerWidth() +'px');
			});
		},
		0);
	});
		
	// let's kickstart this beast
	// we use $timeout to delay start until $digest is completed
	$timeout(
		function(){
			MopidyService.start();
		},0
	);
    
    // figure out who we are on Spotify
    // TODO: Hold back on this to make sure we're authorized
    SpotifyService.getMe()
        .success( function(response){
            $scope.spotifyUser = response;
        
            // save user to settings
            SettingsService.setSetting('spotifyuserid', $scope.spotifyUser.id);

            // now get my playlists
            SpotifyService.getPlaylists( $scope.spotifyUser.id )
                .success(function( response ) {

                    var sanitizedPlaylists = [];

                    // loop all of our playlists, and set up a menu item for each
                    $.each( response.items, function( key, playlist ){

                        // we only want to add playlists that this user owns
                        if( playlist.owner.id == $scope.spotifyUser.id ){
                            sanitizedPlaylists.push({
                                Title: playlist.name,
                                Link: '/browse/playlist/'+playlist.uri,
                                Type: 'playlist',
                                Playlist: playlist,
                                Droppable: true
                            });
                        }
                    });

                    // now loop the main menu to find our Playlist menu item
                    for(var i in $scope.mainMenu ){
                        if( $scope.mainMenu[i].Link == 'playlists'){
                            // inject our new menu children
                            $scope.mainMenu[i].Children = sanitizedPlaylists;
                            break; //Stop this loop, we found it!
                        }
                    }
                })
                .error(function( error ){
                    $scope.status = 'Unable to load your playlists';
                });
        })
        .error(function( error ){
            $scope.status = 'Unable to look you up';
        });
	
	
	/**
	 * Delete key pressed
	 * TODO: Figure out a way to integrate this into TracklistController
	 **/
	
	$('body').bind('keyup',function(evt){
        
        // delete key
		if( evt.which === 46 )
			deleteKeyReleased();
        
        // esc key
		if( evt.which === 27 ){
			if( dragging ){
                dragging = false;
                $(document).find('.drag-tracer').hide();
            }
        }
	});
	
	// not in tracklistcontroller because multiple tracklists are stored in memory at any given time
	function deleteKeyReleased(){
		
		var tracksDOM = $(document).find('.track.selected');
		var tracks = [];
		
		
		// --- DELETE FROM PLAYLIST --- //
		
		if( $route.current.$$route.controller == 'PlaylistController' ){
			
			// TODO: add check of userid. We want to disallow deletes if the playlist owner.id
			// does not match the logged in user.id. Currently we just get an error from SpotifyService
			
			// construct each track into a json object to delete
			$.each( $(document).find('.track'), function(trackKey, track){
				if( $(track).hasClass('selected') ){
					tracks.push( {uri: $(track).attr('data-uri'), positions: [trackKey]} );
				}
			});
			
			// parse these uris to spotify and delete these tracks
			SpotifyService.deleteTracksFromPlaylist( $routeParams.uri, tracks )
				.success(function( response ) {
					tracksDOM.remove();
				})
				.error(function( error ){
					console.log( error );
				});
		
			
		// --- DELETE FROM QUEUE --- //
			
		}else if( $route.current.$$route.controller == 'QueueController' ){
		
			// fetch each tlid and put into delete array
			$.each( $(document).find('.track.selected'), function(trackKey, track){
				tracks.push( parseInt($(track).attr('data-tlid')) );
			});
			
			MopidyService.removeFromTrackList( tracks );
		}
	}
    
    /**
     * Detect if we have a droppable target
     * @var target = event.target object
     * @return jQuery DOM object
     **/
    function getDroppableTarget( target ){
        
        var droppableTarget = null;
        
        if( $(target).hasClass('droppable') )
            droppableTarget = $(target);
        else if( $(target).closest('.droppable').length > 0 )
            droppableTarget = $(target).closest('.droppable');   
        
        return droppableTarget;
    }
	
	
    /**
     * Dragging of tracks
     **/
    var tracksBeingDragged = [];
    var dragging = false;
	var dragThreshold = 30;
	
	// when the mouse id pressed down on a .track
	$(document).on('mousedown', '.track', function(event){
	
		// get the .track row in question
		var track = $(event.currentTarget);
		if( !track.hasClass('track') )
			track = track.closest('.track');
	
		// get the sibling selected tracks too
		var tracks = track.siblings('.selected').andSelf();
		
		// create an object that gives us all the info we need
		dragging = {
					safetyOff: false,			// we switch this when we're outside of the dragThreshold
					clientX: event.clientX,
					clientY: event.clientY,
					tracks: tracks
				}
	});
	
	// when we release the mouse, release dragging container
	$(document).on('mouseup', function(event){
		if( typeof(dragging) !== 'undefined' && dragging.safetyOff ){
			
            $(document).find('.droppable').removeClass('dropping');
            
			// identify the droppable target that we've released on (if it exists)
			var target = getDroppableTarget( event.target );
			
			// if we have a target
			if( target ){
				$(document).find('.drag-tracer').html('Dropping...').fadeOut('fast');
				
				// get the uris
				var uris = [];
				$.each( dragging.tracks, function(key, value){
					uris.push( $(value).attr('data-uri') );
				});
				
				// dropping on queue
				if( target.attr('data-type') === 'queue' ){
				
					MopidyService.addToTrackList( uris );
					
				// dropping on playlist
				}else if( target.attr('data-type') === 'playlist' ){
				
					SpotifyService.addTracksToPlaylist( target.attr('data-uri'), uris );				
				}
				
			// no target, no drop action required
			}else{
				$(document).find('.drag-tracer').fadeOut('medium');
			}
		}
			
		// unset dragging
		dragging = false;
	});
	
	// when we move the mouse, check if we're dragging
	$(document).on('mousemove', function(event){
		if( dragging ){
			
			var left = dragging.clientX - dragThreshold;
			var right = dragging.clientX + dragThreshold;
			var top = dragging.clientY - dragThreshold;
			var bottom = dragging.clientY + dragThreshold;
			
			// check the threshold distance from mousedown and now
			if( event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom ){

                var target = getDroppableTarget( event.target );
                var dragTracer = $(document).find('.drag-tracer');
			
				// turn the trigger safety of
				dragging.safetyOff = true;

                // setup the tracer, and make him sticky
                dragTracer
                    .show()
                    .css({
                        top: event.clientY-10,
                        left: event.clientX+10
                    });
                
                $(document).find('.droppable').removeClass('dropping');
                
                if( target && target.attr('data-type') === 'queue' ){
                    dragTracer.addClass('good').html('Add to queue');
                    target.addClass('dropping');
                }else if( target && target.attr('data-type') === 'playlist' ){
                    dragTracer.addClass('good').html('Add to playlist');
                    target.addClass('dropping');
                }else{
                    dragTracer.removeClass('good').html('Dragging '+dragging.tracks.length+' track(s)');
                }
			}
		}
	});
	
});





