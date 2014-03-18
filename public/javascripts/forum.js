define(['angular', 'jquery', 'underscore', 'socketio', 'md5', "pagedown-converter", "pagedown-sanitizer", 'angular-sanitize', 'user', 'confirm-click'], function(angular, $, _, io, md5, pagedown, sanitizer) {
    var app = angular.module('ximeraApp.forum', ["ngSanitize", "ximeraApp.confirmClick"]);

    // public domain code to handle relative date display
    $.getRelativeTime = function(diff) {
	var v = Math.floor(diff / 86400); diff -= v * 86400;
	if (v > 0) return (v == 1 ? 'Yesterday' : v + ' days ago');
	v = Math.floor(diff / 3600); diff -= v * 3600;
	if (v > 0) return v + ' hour' + (v > 1 ? 's' : '') + ' ago';
	v = Math.floor(diff / 60); diff -= v * 60;
	if (v > 0) return v + ' minute' + (v > 1 ? 's' : '') + ' ago';
	return 'Just now';
    };

    var toRelativeTime = function(date) {
	var x = Math.round(date / 1000);
	return $.getRelativeTime(Math.round(new Date().getTime() / 1000) - x);
    };

    $.fn.toRelativeTime = function() {
	var t = $(this), x = Math.round(Date.parse(t.text()) / 1000);
	if (x) t.text($.getRelativeTime(Math.round(
	    new Date().getTime() / 1000) - x));
    };
    
    $.toRelativeTime = function(s) { $(s).each(function() { 
	$(this).toRelativeTime(); 
    }); };


    app.factory('ForumService', ['$rootScope', '$http', function ($rootScope, $http) {
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

    app.directive('thread', ['$compile', '$rootScope', function ($compile, $rootScope) {
        return {
            restrict: 'A',
            scope: {
		posts: '=',
		parent: '=',
		forumName: '@'
            },
            templateUrl: '/template/forum/thread',
            replace: true,

	    // This is needed to permit the recursive directive to terminate
	    compile: function(tElement, tAttr) {
		var contents = tElement.contents().remove();
		var compiledContents;
		return function(scope, iElement, iAttr) {
		    if(!compiledContents) {
			compiledContents = $compile(contents);
		    }
		    compiledContents(scope, function(clone, scope) {
			iElement.append(clone); 
		    });
		};
	    }

        };
    }]);

    app.directive('post', ["$http", "$sce", "userService", function ($http, $sce, user) {
        return {
            restrict: 'A',
            scope: {
		post: '=',
		forumName: '@',
            },
            templateUrl: '/template/forum/post',

	    controller: function($scope, $element){
		$scope.user = user;

		$scope.$watch('post.content', function (value) {
		    var safeConverter = Markdown.getSanitizingConverter();
		    if (!value)
			$scope.htmlContent = '';
		    else
			$scope.htmlContent = $sce.trustAsHtml(safeConverter.makeHtml(value));
		});
		
		$scope.upvote = function() {
		    $http.post( '/forum/upvote/' + $scope.post._id );
		    if ($scope.post.upvoters.indexOf( $scope.user.current._id ) == -1) {
			$scope.post.upvoters.push( $scope.user.current._id );
			$scope.post.upvotes = $scope.post.upvotes + 1;
		    }
		};

		$scope.delete = function() {
		    $http.delete( '/forum/' + $scope.post._id );
		};

		$scope.flag = function() {
		    $http.post( '/forum/flag/' + $scope.post._id );
		    if ($scope.post.flaggers.indexOf( $scope.user.current._id ) == -1) {
			$scope.post.flaggers.push( $scope.user.current._id );
			$scope.post.flags = $scope.post.flags + 1;
		    }
		};
	    }
	};}]);

    app.factory('socket', function ($rootScope) {
	var socket = io.connect();
	return {
	    on: function (eventName, callback) {
		socket.on(eventName, function () {  
		    var args = arguments;
		    $rootScope.$apply(function () {
			callback.apply(socket, args);
		    });
		});
	    },
	    emit: function (eventName, data, callback) {
		socket.emit(eventName, data, function () {
		    var args = arguments;
		    $rootScope.$apply(function () {
			if (callback) {
			    callback.apply(socket, args);
			}
		    });
		})
	    }
	};
    });

    app.directive('forum', ['$http', 'socket', 'userService', '$timeout', function ($http, socket, userService, $timeout) {
        return {
            restrict: 'A',
            scope: {
		forum: '@',
            },
            templateUrl: '/template/forum/forum',
            transclude: true,

	    controller: function($scope, $element){
	     	$scope.toplevel = [];
		$scope.posts = {};
		$scope.user = userService;

		// posts need to be added in chronological order to recreate threads
		$scope.addPost = function(post) {
		    $scope.posts[post._id] = post;

		    post.dateRelativeToNow = function() {
			return toRelativeTime(new Date(post.date));
		    };

		    post.localeDate = (new Date(post.date)).toLocaleString();

		    var parent = { replies: $scope.toplevel };
		    if ('parent' in post) {
			var newParent = $scope.posts[post.parent];

			if (newParent)
			    parent = newParent;

			if (!('replies' in parent)) 
			    parent.replies = [];
		    }

		    // push the post to the parent.replies array, unless the array already contains a post with that _id
		    var duplicatePost = _.findWhere( parent.replies, { _id: post._id } );
		    if (duplicatePost) {
			parent.replies.splice( parent.replies.indexOf(duplicatePost), 1 );
		    }

		    parent.replies.push( post );
		};

		
		//var socket = io.connect('http://localhost:3000/');
		socket.emit( 'join room', $scope.forum );

		$scope.$on('post', function (event, data) {
		    $scope.addPost( data );
		    $timeout(function () {
			MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
		    });
		});

		socket.on('post', function (data) {
		    $scope.addPost( data );
		    // BADBAD: it'd be better to trigger mathjax from the directive
		    $timeout(function () {
			MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
		    });
		});

		$http.get( '/forum/' + $scope.forum ).success(function(data){
		    _.each( data, $scope.addPost );
		});
	    }

    };}]);

    ////////////////////////////////////////////////////////////////
    // Reply directive
    app.directive('reply', ['$http', 'userService', function ($http, user) {
        return {
            restrict: 'A',
            scope: {
		forumName: '@',
		parent: '@',
		replyDone: '&'
            },
            templateUrl: '/template/forum/reply',

	    controller: function($scope, $element){
		$scope.user = user;

		if ('email' in user.current) {
		    $scope.gravatar = md5(user.current.email);
		}

		$scope.newPost = {};

		$scope.cancel = function() {
		    $scope.replyDone();
		}

		$scope.newPost.post = function() {
		    $scope.$emit( 'Xarma', 1 );

		    if ($scope.anonymously)
			$scope.anonymously = true;
		    else
			$scope.anonymously = false;

		    $http.post( '/forum/' + $scope.forumName, {content: $scope.newPost.content, parent: $scope.parent, anonymously: $scope.anonymously} ).success(function(data){
			$scope.replyDone();
			$scope.errorMessage = undefined;
			$scope.$emit( 'post', data[0] );
		    }).error(function(data, status, headers, config) {
			$scope.errorMessage = 'Could not post your message.  ' + data;
		    })
		};
	    }
    };}]);


    ////////////////////////////////////////////////////////////////
    // Edit post
    app.directive('editPost', ['$http', 'userService', function ($http, user) {
        return {
            restrict: 'A',
            scope: {
		forumName: '@',
		postId: '@',
		previousContent: '@',
		editDone: '&'
            },
            templateUrl: '/template/forum/edit',

	    controller: function($scope, $element){
		$scope.user = user;

		if ('email' in user.current) {
		    $scope.gravatar = md5(user.current.email);
		}

		$scope.newPost = { content: $scope.previousContent };

		$scope.cancel = function() {
		    $scope.editDone();
		}

		$scope.newPost.post = function() {
		    $scope.$emit( 'Xarma', 1 );

		    if ($scope.anonymously)
			$scope.anonymously = true;
		    else
			$scope.anonymously = false;

		    $http.put( '/forum/' + $scope.postId, {content: $scope.newPost.content, anonymously: $scope.anonymously} ).success(function(data){
			$scope.editDone();
			$scope.errorMessage = undefined;
			$scope.$emit( 'post', data[0] );
		    }).error(function(data, status, headers, config) {
			$scope.errorMessage = 'Could not edit your message.  ' + data;
		    })
		};
	    }
    };}]);

    ////////////////////////////////////////////////////////////////
    // rerun mathjax when the given attribute changes
    app.directive('mathjaxOnChange', [function() {
	return {
	    link: function($scope, element, attrs) {
		attrs.$observe('mathjaxOnChange', function(val) {
		    MathJax.Hub.Queue(["Typeset", MathJax.Hub, $(element).children()[0]]);
		});
	    }
	};
    }]);

});
