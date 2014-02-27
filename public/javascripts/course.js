define(['angular', 'jquery', 'underscore', 'angular-animate'], function(angular, $, _) {
    var app = angular.module('ximeraApp.course', ['ngAnimate']);

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
		    var result = f(nodes[i]);
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
	    var breadcrumbs = [activity];
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

    app.directive('courseNavigation', ["$animate", function ($animate) {
        return {
            restrict: 'A',
            scope: {
            },
            templateUrl: '/template/course-navigation',

	    controller: function($scope, $element){
		$scope.course = new Course();
		_.extend( $scope.course, $scope.$parent.course );

		$scope.currentActivity = $scope.$parent.currentActivity;
	    }
	};}]);

});
