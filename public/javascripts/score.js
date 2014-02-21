define(['angular', 'jquery', 'underscore'], function(angular, $, _) {
    var app = angular.module('ximeraApp.score', ["ngAnimate"]);

    app.factory('scoreService', ['$rootScope', '$http', function ($rootScope, $http) {
	var service = {};

	service.scores = { xudos: 0, xarma: 0 };

	$http.get( '/users/xarma' ).success(function(data){
	    service.scores.xarma = parseInt(data);
	});

	$http.get( '/users/xudos' ).success(function(data){
	    service.scores.xudos = parseInt(data);
	});

	$rootScope.$on('Xarma', function(e, points) {
	    $http.post( '/users/xarma', {points: points} ).success(function(data){
		service.scores.xarma = parseInt(data);
	    });
	});

	$rootScope.$on('Xudos', function(e, points) {
	    $http.post( '/users/xudos', {points: points} ).success(function(data){
		service.scores.xudos = parseInt(data);
	    });
	});

        return service;
    }]);

    app.directive('highlightOnChange', ['$animate', function($animate) {
	return {
	    link: function($scope, element, attrs) {
		attrs.$observe('highlightOnChange', function(val) {
		    $(element).removeClass('heartbeat');
		    $(element).css('opacity');
		    $(element).css({'opacity': 0.25});
		    $(element).css('opacity');
		    $(element).addClass('heartbeat');
		    $(element).css({'opacity': 1.0});
		});
	    }
	};
    }]);

    app.controller('ScoreController', ["$scope", 'scoreService', function ($scope, scoreService) {
	$scope.scores = scoreService.scores;
    }]);


});
