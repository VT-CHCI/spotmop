'use strict';

angular.module('spotmop.browse.artist', [
    'ngRoute'
])

.config(function($routeProvider) {
    $routeProvider
        .when("/browse/artist/:uri", {
            templateUrl: "app/browse/artist/template.html",
            controller: "ArtistController"
        });
})

.directive('textOverImage', function() {
    return {
        restrict: 'A',
        link: function($scope, $element, $attrs) {
            
            $scope.$on('spotmop:pageUpdated', function(event){
                BackgroundCheck.init({
                    targets: $($element).parent(),
                    images: $(document).find('.artist-intro .image')
                });
                BackgroundCheck.refresh();
            });
        }
    };
})

.controller('ArtistController', function ArtistController( $scope, $rootScope, $timeout, SpotifyService, EchonestService, $routeParams, $sce ){
	
	$scope.artist = {};
	$scope.tracks = {};
	$scope.albums = {};
	$scope.relatedArtists = {};
	
    $rootScope.$broadcast('spotmop:notifyUser', {type: 'loading', id: 'loading-artist', message: 'Loading'});
    
	// get the artist
	SpotifyService.getArtist( $routeParams.uri )
		.success( function( response ){
		
			$scope.artist = response;
    
            // get the biography
            EchonestService.getArtistBiography( $routeParams.uri )
                .success( function( response ){
                    $scope.artist.biography = response.response.biographies[0];
                });
		
			// get the artist's albums
			SpotifyService.getAlbums( $routeParams.uri )
				.success( function( response ){
					$scope.albums = response;
				
					// get the artist's top tracks
					SpotifyService.getTopTracks( $routeParams.uri )
						.success( function( response ){
							$scope.tracks = response.tracks;
				
							// get the artist's related artists
							SpotifyService.getRelatedArtists( $routeParams.uri )
								.success( function( response ){
									$scope.relatedArtists = response.artists;
									$rootScope.$broadcast('spotmop:pageUpdated');
                                    $rootScope.$broadcast('spotmop:notifyUserRemoval', {id: 'loading-artist'});
								})
                                .error(function( error ){
                                    $rootScope.$broadcast('spotmop:notifyUserRemoval', {id: 'loading-artist'});
                                    $rootScope.$broadcast('spotmop:notifyUser', {type: 'bad', id: 'loading-artist', message: error.error.message});
                                });
						});
				});
		});
	
});