define(['angular', 'jquery', 'underscore'], function(angular, $, _) {
    var app = angular.module('ximeraApp.user', ["ngAnimate"]);

    app.factory('userService', ['$http', function ($http) {
	var service = {};
	
	service.user = function(id) {
	    var promise = $http.get( '/users/' + id ).then(function(response){
		var user = response.data;

		user.save = function() {
		    $http.put( '/users/', {user: user} );
		    return;
		};

		return user;
	    });

	    return promise;
	};

	/*
	service.current = function() {
	    return service.user('');
	};
	*/

        return service;
    }]);

    app.controller('LoginController', ["$scope", 'userService', function ($scope, userService) {
	userService.current = $scope.user;
    }]);

    app.controller('UserController', ["$scope", 'userService', function ($scope, userService) {
	userService.user($scope.userId).then(function(user) {
	    $scope.user = user;
	});

	$scope.edit = function() {
	    $scope.editing = true;
	}

	$scope.save = function() {
	    $scope.editing = false;
	    $scope.user.save();
	}

	$scope.cancel = function() {
	    $scope.editing = false;
	}

    }]);

});
