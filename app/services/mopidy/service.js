/*
 * Inspired and mostly coming from MartijnBoland's MopidyService.js
 * https://github.com/martijnboland/moped/blob/master/src/app/services/mopidyservice.js
 */
'use strict';

angular.module('spotmop.services.mopidy', [
    //"spotmop.services.settings",
    //'llNotifier'
])

.factory("MopidyService", function($q, $rootScope, $cacheFactory, $location, SettingsService /*, Settings, notifier */){
	
	// Create consolelog object for Mopidy to log it's logs on
    var consoleLog = function () {};
    var consoleError = console.error.bind(console);

    /*
     * Wrap calls to the Mopidy API and convert the promise to Angular $q's promise.
     * 
     * @param String functionNameToWrap
     * @param Object thisObj
     */
	function wrapMopidyFunc(functionNameToWrap, thisObj) {
		return function() {
			var deferred = $q.defer();
			var args = Array.prototype.slice.call(arguments);
			var self = thisObj || this;

			$rootScope.$broadcast('spotmop:callingmopidy', { name: functionNameToWrap, args: args });

			if (self.isConnected) {
				executeFunctionByName(functionNameToWrap, self, args).then(function(data) {
					deferred.resolve(data);
					$rootScope.$broadcast('spotmop:calledmopidy', { name: functionNameToWrap, args: args });
				}, function(err) {
					deferred.reject(err);
					$rootScope.$broadcast('spotmop:errormopidy', { name: functionNameToWrap, args: args, err: err });
				});
			}
			else{
				executeFunctionByName(functionNameToWrap, self, args).then(function(data) {
					deferred.resolve(data);
					$rootScope.$broadcast('spotmop:calledmopidy', { name: functionNameToWrap, args: args });
				}, function(err) {
					deferred.reject(err);
					$rootScope.$broadcast('spotmop:errormopidy', { name: functionNameToWrap, args: args, err: err });
				});
			}
			return deferred.promise;
		};
	}

	/*
     * Execute the given function
     * 
     * @param String functionName
     * @param Object thisObj
	 * @param Array args
     */
	function executeFunctionByName(functionName, context, args) {
		var namespaces = functionName.split(".");
		var func = namespaces.pop();

		for(var i = 0; i < namespaces.length; i++) {
			context = context[namespaces[i]];
		}

		return context[func].apply(context, args);
	}

	return {
		mopidy: {},
		isConnected: false,
		currentTlTracks: [],

		/*
		 * Method to start the Mopidy conneciton
		 */
		start: function(){
            var self = this;

			// Emit message that we're starting the Mopidy service
			$rootScope.$broadcast("spotmop:startingmopidy");

            // Get mopidy ip and port from settigns
            var mopidyhost = SettingsService.getSetting("mopidyhost", $location.host());
            var mopidyport = SettingsService.getSetting("mopidyport", "6680");
			
			// Initialize mopidy
            try{
    			this.mopidy = new Mopidy({
    				webSocketUrl: "ws://" + mopidyhost + ":" + mopidyport + "/mopidy/ws", // FOR DEVELOPING 
    				callingConvention: 'by-position-or-by-name'
    			});
		
				// this gives us a handy list of all functions available via mopidy
				// console.log( this.mopidy );
            }
			catch(e){
                // need to re-initiate notifier
				//notifier.notify({type: "custom", template: "Connecting with Mopidy failed with the following error message: <br>" + e, delay: 15000});

                // Try to connect without a given url
                this.mopidy = new Mopidy({
                    callingConvention: 'by-position-or-by-name'
                });
            }
			
			this.mopidy.on(consoleLog);
			
			// Convert Mopidy events to Angular events
			this.mopidy.on(function(ev, args) {
				$rootScope.$broadcast('mopidy:' + ev, args);
				if (ev === 'state:online') {
					self.isConnected = true;
				}
				if (ev === 'state:offline') {
					self.isConnected = false;
				}
			});

			$rootScope.$broadcast('spotmop:mopidystarted');
		},
		stop: function() {
			$rootScope.$broadcast('spotmop:mopidystopping');
			this.mopidy.close();
			this.mopidy.off();
			this.mopidy = null;
			$rootScope.$broadcast('spotmop:mopidystopped');
		},
		restart: function() {
			this.stop();
			this.start();
		},
		getPlaylists: function() {
			return wrapMopidyFunc("mopidy.playlists.getPlaylists", this)();
		},
		getPlaylist: function(uri) {
			return wrapMopidyFunc("mopidy.playlists.lookup", this)({ uri: uri });
		},
		getLibrary: function() {
			return wrapMopidyFunc("mopidy.library.browse", this)({ uri: null });
		},
		getLibraryItems: function(uri) {
			return wrapMopidyFunc("mopidy.library.browse", this)({ uri: uri });
		},
		refresh: function(uri) {
			return wrapMopidyFunc("mopidy.library.refresh", this)({ uri: uri });
		},
		getDirectory: function(uri) {
			return wrapMopidyFunc("mopidy.library.lookup", this)({ uri: uri });
		},
		getTrack: function(uri) {
			return wrapMopidyFunc("mopidy.library.lookup", this)({ uri: uri });
		},
		getAlbum: function(uri) {
			return wrapMopidyFunc("mopidy.library.lookup", this)({ uri: uri });
		},
		getArtist: function(uri) {
			return wrapMopidyFunc("mopidy.library.lookup", this)({ uri: uri });
		},
		search: function(query) {
			return wrapMopidyFunc("mopidy.library.search", this)({ any : [ query ] });
		},
		getCurrentTrack: function() {
			return wrapMopidyFunc("mopidy.playback.getCurrentTrack", this)();
		},
		getCurrentTlTrack: function() {
			return wrapMopidyFunc("mopidy.playback.getCurrentTlTrack", this)();
		},
		getTimePosition: function() {
			return wrapMopidyFunc("mopidy.playback.getTimePosition", this)();
		},
		seek: function(timePosition) {
			return wrapMopidyFunc("mopidy.playback.seek", this)({ time_position: timePosition });
		},
		getVolume: function() {
			return wrapMopidyFunc("mopidy.mixer.getVolume", this)();
		},
		setVolume: function(volume) {
			return wrapMopidyFunc("mopidy.mixer.setVolume", this)({ volume: volume });
		},
		getState: function() {
			return wrapMopidyFunc("mopidy.playback.getState", this)();
		},
		playTrack: function(newTracklistUris, trackToPlayIndex) {
			var self = this;

		// stop playback
			self.mopidy.playback.stop()
				.then(function() {

					// clear the current tracklist
					self.mopidy.tracklist.clear();

				}, consoleError)
				.then(function() {

					// add the surrounding tracks (ie the whole tracklist in focus)
					self.mopidy.tracklist.add({ uris: newTracklistUris });

				}, consoleError)
				.then(function() {

					// get the new tracklist
					self.mopidy.tracklist.getTlTracks()
					.then(function(tlTracks) {

						// save tracklist for later
						self.currentTlTracks = tlTracks;

						self.mopidy.playback.play({ tl_track: tlTracks[trackToPlayIndex] });
				}, consoleError);
			}, consoleError);

		/*
		// Check if a playlist change is required. If not just change the track.
		if (self.currentTlTracks.length > 0) {
		var trackUris = _.pluck(surroundingTracks, 'uri');
		var currentTrackUris = _.map(self.currentTlTracks, function(tlTrack) {
		return tlTrack.track.uri;
		});
		if (_.difference(trackUris, currentTrackUris).length === 0) {
		// no playlist change required, just play a different track.
		self.mopidy.playback.stop()
		.then(function () {
		var tlTrackToPlay = _.find(self.currentTlTracks, function(tlTrack) {
		return tlTrack.track.uri === track.uri;
		});
		self.mopidy.playback.play({ tl_track: tlTrackToPlay });
		});
		return;
		}
		}

		self.mopidy.playback.stop()
		.then(function() {
		self.mopidy.tracklist.clear();
		}, consoleError)
		.then(function() {
		self.mopidy.tracklist.add({ tracks: surroundingTracks });
		}, consoleError)
		.then(function() {
		self.mopidy.tracklist.getTlTracks()
		.then(function(tlTracks) {
		self.currentTlTracks = tlTracks;
		var tlTrackToPlay = _.find(tlTracks, function(tlTrack) {
		return tlTrack.track.uri === track.uri;
		});
		self.mopidy.playback.play({ tl_track: tlTrackToPlay });
		}, consoleError);
		} , consoleError);
		*/
		},
		playTlTrack: function( tlTrack ){
			var self = this;
			self.mopidy.playback.play({ tl_track: tlTrack });
		},
		playStream: function(streamUri) {
			var self = this;

			self.stopPlayback(true)
				.then(function() {
					self.mopidy.tracklist.clear();
				}, consoleError)
				.then(function() {
					self.mopidy.tracklist.add({ at_position: 0, uri: streamUri });
				}, consoleError)
				.then(function() {
					self.mopidy.playback.play();
				}, consoleError);
		},
		play: function() {
			return wrapMopidyFunc("mopidy.playback.play", this)();
		},
		pause: function() {
			return wrapMopidyFunc("mopidy.playback.pause", this)();
		},
		stopPlayback: function(clearCurrentTrack) {
			return wrapMopidyFunc("mopidy.playback.stop", this)();
		},
		previous: function() {
			return wrapMopidyFunc("mopidy.playback.previous", this)();
		},
		next: function() {
			return wrapMopidyFunc("mopidy.playback.next", this)();
		},
		getRandom: function () {
			return wrapMopidyFunc("mopidy.tracklist.getRandom", this)();
		},
		setRandom: function (isRandom) {
			return wrapMopidyFunc("mopidy.tracklist.setRandom", this)([ isRandom ]);
		},
		getCurrentTrackList: function () {
			return wrapMopidyFunc("mopidy.tracklist.getTracks", this)();
		},
		getCurrentTlTracks: function () {
			return wrapMopidyFunc("mopidy.tracklist.getTlTracks", this)();
		},
		removeFromTrackList: function( tlids ){var self = this;
			self.mopidy.tracklist.remove({tlid: tlids}).then( function(){
				return true;
			});
		}

	};
});