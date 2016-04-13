define(['angular', 'jquery', 'underscore', "pagedown-converter", "pagedown-sanitizer", "pagedown-editor"], function(angular, $, _, converter, sanitizer, editor) {
    var app = angular.module('ximeraApp.pagedown', []);

    app.factory('pagedownUuidService', ['$rootScope', function ($rootScope) {
	var uuid = 0;

	return function() {
	    uuid = uuid + 1;
	    return '-uuid' + uuid;
	};
    }]);
    

    app.directive('pagedown', ['$compile', '$rootScope', 'pagedownUuidService', function ($compile, $rootScope, uuidService) {
        return {
            restrict: 'A',
            scope: {
		ngModel: '=',
            },
            transclude: true,

	    controller: function($scope){
	    },

            link: function($scope, element, attrs, controller, transclude) {
		$scope.wmd = uuidService();
		$scope.textarea = {value: $scope.ngModel};

		var form = $('<div class="wmd-panel">' +
			     '<div id="wmd-button-bar' + $scope.wmd + '"></div>' + 
			     '<textarea class="content form-control" ng-model="textarea.value" rows="5" id="wmd-input' + $scope.wmd + '" name="content"/>' + 
			     '<div id="wmd-preview' + $scope.wmd + '" class="wmd-panel wmd-preview"></div>');

		$(element).append( form );
		var textarea = $('textarea',element);

		var converter = Markdown.getSanitizingConverter();
		var editor = new Markdown.Editor(converter, $scope.wmd);

		editor.hooks.chain("onPreviewRefresh", function () {
		    MathJax.Hub.Queue(
			["Typeset",MathJax.Hub, $('.wmd-preview' + $scope.wmd).get(0)]
    		    );
		});

		// update model from view
		$(textarea).on("keyup change input propertychange", function (e) {
		    $scope.$apply( function() {
			$scope.textarea.value = $(textarea).val();
			$scope.ngModel = $scope.textarea.value;
		    });
		});

		// run should be called after you've added your plugins to the editor (if any).
		editor.run();

		// update view from model
		$scope.$watch('textarea.value', function (value) {
		    if (value != textarea.val()) {
			textarea.text( value );
			editor.refreshPreview()
		    }
		});
	    }
        };
    }]);

});
