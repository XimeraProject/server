define(['angular', 'jquery', 'underscore', "pagedown-converter", "pagedown-sanitizer", "pagedown-editor"], function(angular, $, _, converter, sanitizer, editor) {
    var app = angular.module('ximeraApp.freeResponse', ["ximeraApp.activityServices"]);

    app.directive('ximeraFreeResponse', ['$compile', '$rootScope', 'stateService', "$sce", function ($compile, $rootScope, stateService, $sce) {
        return {
            restrict: 'A',
            scope: {},
            templateUrl: '/template/free-response',
            transclude: true,
            link: function($scope, element, attrs, controller, transclude) {
                // Extract python code from original.
                transclude(function (clone) {
		    var html = "";
		    var i;
		    for (i=0; i<clone.length; i++) {
			html += "<p>" + (clone[i].innerHTML||'') + "</p>";
		    }
		    $scope.htmlSolution = $sce.trustAsHtml(html);
		});

                stateService.bindState($scope, $(element).attr('data-uuid'), function () {
		    $scope.db.success = false;
		    $scope.db.message = "";
                });

		$scope.wmdName = "-" + $(element).attr('data-uuid');

		var formHtml = '<div class="wmd-panel compose">' +
		    '<div id="wmd-button-bar' + $scope.wmdName + '"></div>' + 
		    '<textarea class="content form-control" ng-model="db.response" rows="5" id="wmd-input' + $scope.wmdName + '" name="content"/>' + 
		    '<div id="wmd-preview' + $scope.wmdName + '" class="wmd-panel wmd-preview"></div>' +
		    '<div class="model-solution" ng-show="db.viewSolution" ng-bind-html="htmlSolution"></div>' +
		    '</div>';
		var form = $compile(formHtml)($scope);
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
		//toolbar.append( $('<div class="btn-group"><button class="btn btn-primary"><i class="fa fa-share"></i>&nbsp;Submit to Peers</button><button class="btn btn-warning"><i class="fa fa-thumbs-up"></i>&nbsp;Review Peers</button></div>') );		
		var button = '<button class="btn btn-info" ng-click="db.viewSolution = true;" ng-hide="db.viewSolution"><i class="fa fa-eye"></i>&nbsp;View model solution</button><button class="btn btn-info" ng-click="db.viewSolution = false;" ng-show="db.viewSolution"><i class="fa fa-eye-slash"></i>&nbsp;Hide model solution</button>';
		toolbar.append( $compile(button)($scope) );

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
