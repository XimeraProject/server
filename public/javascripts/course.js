define(['angular', 'jquery', 'underscore', 'angular-animate', 'activity-services'], function(angular, $, _) {
    var app = angular.module('ximeraApp.course', ['ngAnimate', 'ximeraApp.activityServices']);

    RegExp.escape= function(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    var Course = function() {
	this.normalizeSlug = function normalizeActivitySlug(activitySlug) {
	    var repo = this.slug.split('/').slice(0,2).join( '/' )
	    var re = new RegExp("^" + RegExp.escape(repo) + '\\/');
	    return activitySlug.replace( ":", '/' ).replace( re, '' );
	};

	this.activityURL = function activityURL(activity) {
	    return "/course/" + this.slug + "/activity/" + this.normalizeSlug(activity.slug) + "/";
	};
	
	this.flattenedActivities = function flattenedActivities() {
	    var queue = [];

	    var f = function(nodes) {
		for(var i = 0; i < nodes.length; i++) {
		    queue.push( nodes[i] );
		    f(nodes[i].children);
		}
	    };
	    
	    f(this.activityTree);

	    return queue;
	};

	this.activity = function activity(incompleteActivity) {
	    var flattened = this.flattenedActivities();

	    var result = _.find( flattened, function(x) { return x.slug === incompleteActivity.slug } );
	    if (result === undefined)
		return null;

	    return result;
	}

	this.previousActivity = function previousActivities(activity) {
	    var flattened = this.flattenedActivities();

	    activity = _.find( flattened, function(x) { return x.slug === activity.slug } );
	    if (activity === undefined)
		return null;

	    var i = _.indexOf( flattened, activity );

	    if (i <= 0)
		return null;

	    return flattened[i-1];
	};

	this.nextActivity = function nextActivities(activity) {
	    var flattened = this.flattenedActivities();

	    activity = _.find( flattened, function(x) { return x.slug === activity.slug } );
	    if (activity === undefined)
		return null;

	    var i = _.indexOf( flattened, activity );

	    if (i + 1 < flattened.length)
		return flattened[i+1];

	    return null;
	};

	this.activityParent = function activityParent(activity) {
	    var f = function(nodes) {
		for(var i = 0; i < nodes.length; i++) {
		    var result = f(nodes[i].children);
		    if (result) return result;

		    if (_.where( nodes[i].children, {slug: activity.slug} ).length > 0) {
			return nodes[i];
		    }
		}

		return null;
	    };

	    return f(this.activityTree);
	};

	this.activityAncestors = function activityAncestors(activity) {
	    var breadcrumbs = [this.activity(activity)];
	    while( breadcrumbs[0] != null ) {
		breadcrumbs.unshift( this.activityParent(breadcrumbs[0]) );
            }
	    breadcrumbs.shift();

	    return breadcrumbs;
	};

	this.activityChildren = function activityChildren(activity) {
	    var flattened = this.flattenedActivities();

	    activity = _.find( flattened, function(x) { return x.slug === activity.slug } );
	    if (activity === undefined)
		return [];

	    return activity.children;
	};

	this.activitySiblings = function activitySiblings(activity) {
	    var parent = this.activityParent(activity);

	    if (parent)
		return parent.children;

	    return this.activityTree;
	};
    };

    app.directive('courseNavigation', ['completionService', 'userService', function (completions, userService) {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: '/template/course-navigation',

	    controller: function($scope, $element){
		$scope.user = userService;

		_.extend( $scope.course, new Course() );
		//$scope.currentActivity = $scope.$parent.currentActivity;
		$scope.completions = completions.activities;
	    }
	};}]);

    app.directive('courseBreadcrumbs', [function () {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: '/template/course-breadcrumbs',

	    controller: function($scope, $element){
		_.extend( $scope.course, new Course() );
		$scope.ancestors = $scope.course.activityAncestors($scope.currentActivity);
	    }
	};}]);
    
    app.directive('completionSymbol', [function ($animate) {
        return {
            restrict: 'A',
            scope: true,

	    link: function($scope, element, attrs) {
                $scope.$watch("completions.completions", function () {
		    var completion = _.find( $scope.completions.completions, function(completion) {
			return completion.activitySlug == $scope.activity.slug;
		    });

		    if (completion)
			$scope.completion = completion;
		    else
			$scope.completion = undefined;
		});
	    }
	};}]);

    app.directive('completionMeter', ['completionService', function (completionService) {
        return {
            restrict: 'A',
            scope: true,
            templateUrl: '/template/completion-meter',

	    link: function($scope, element, attrs) {
		$scope.completions = completionService.activities;

                $scope.$watch("completions.completions", function () {
		    var completion = _.find( $scope.completions.completions, function(completion) {
			return completion.activitySlug == $scope.currentActivity.slug;
		    });

		    if (completion) {
			$scope.completion = completion;
		    }
		});
	    }
	};}]);

    app.directive('completionBlink', ['completionService', '$animate', function (completionService, $animate) {
        return {
            restrict: 'A',
            scope: false,

	    link: function($scope, element, attrs) {
		$scope.completions = completionService.activities;

                $scope.$watch("completions.completions", function () {
		    var completion = _.find( $scope.completions.completions, function(completion) {
			return completion.activitySlug == $scope.currentActivity.slug;
		    });

		    if (completion) {
			if (completion.complete) 
			    $(element).addClass('pulse');
		    }
		});
	    }
	};}]);


    app.directive('highlightIfActive', [function ($animate) {
        return {
            restrict: 'A',
            scope: false,

	    link: function postLink($scope, element, attrs) {
		var course = _.extend( new Course(), $scope.course );

		var ancestors = course.activityAncestors($scope.currentActivity);

		if (ancestors.indexOf(course.activity($scope.activity)) != -1)
		    element.addClass('active-ancestor');

		if ($scope.activity.slug == $scope.currentActivity.slug)
		    element.addClass('active');
	    }
	};}]);


    app.directive( 'locationClick', ['$window', 'stateService', function ( $window, stateService ) {
	return {
	    link: function ( scope, element, attrs ) {
		var path;
		
		attrs.$observe( 'locationClick', function (value) {
		    path = value;
		});
		
		element.bind( 'click', function () {
		    scope.$apply( function () {
                        stateService.updateState(function () {
			    $window.location.href = path;
                        });
		    });
		});
	    }
	}
    }]);

});
