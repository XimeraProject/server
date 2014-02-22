define(['angular', 'jquery', 'underscore', "pagedown-converter", "pagedown-sanitizer", "pagedown-editor"], function(angular, $, _, converter, sanitizer, editor) {
    var app = angular.module('ximeraApp.freeResponse', ["ximeraApp.activity"]);

    app.directive('ximeraFreeResponse', ['$compile', '$rootScope', 'stateService', function ($compile, $rootScope, stateService) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/free-response',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // Extract python code from original.
                transclude(function (clone) {
		    $scope.solution = $(clone).text();
		});

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
		    $scope.db.success = false;
		    $scope.db.message = "";
                });

		$scope.wmdName = "-" + $(element).attr('data-uuid');

		var form = $('<form class="compose">' +
			     '<div class="wmd-panel">' +
			     '<div id="wmd-button-bar' + $scope.wmdName + '"></div>' + 
			     '<textarea class="content form-control" ng-model="db.response" rows="5" id="wmd-input' + $scope.wmdName + '" name="content"/>' + 
			     '<div id="wmd-preview' + $scope.wmdName + '" class="wmd-panel wmd-preview"></div>' +
			     '</div>' +
			     '</form>');
		$(element).append( form );

		var textarea = $('textarea',element);
		
		var converter = Markdown.getSanitizingConverter();
		var editor = new Markdown.Editor(converter, $scope.wmdName);
		
		editor.hooks.chain("onPreviewRefresh", function () {
		    MathJax.Hub.Queue(
			["Typeset",MathJax.Hub, $('.wmd-preview' + $scope.wmdName).get(0)]
    		    );
		});
		
		// update model from view
		$(textarea).on("keyup change input propertychange", function (e) {
		    $scope.$apply( function() {
			$scope.db.response = $(textarea).val();
		    });
		});

		// run should be called after you've added your plugins to the editor (if any).
		editor.run();

		var toolbar = $('#wmd-button-row' + $scope.wmdName, form);
		toolbar.append( $('<div class="btn-group"><button class="btn btn-primary"><i class="fa fa-share"></i>&nbsp;Submit to Peers</button><button class="btn btn-warning"><i class="fa fa-thumbs-up"></i>&nbsp;Review Peers</button></div>') );		

		// update view from model
		$scope.$watch('db.response', function (value) {
		    if (value != textarea.val()) {
			textarea.text( value );
			editor.refreshPreview()
		    }
		});

            }
        };
    }]);

});
