var app = angular.module('activity-display', []);

app.controller('ApplicationController', function ($scope) {});


// TODO: Save complete angular.js state to MongoDB; state is indexed by user and activity hash.
// If activity hash is updated, for now state is thrown away.

// Questions have multiple solutions:
// Solutions each have 1 answer (input format may be different)
// Regardless of input format, trigger "answered", 
// When answered, send result to server to be stored in MongoDB.
// TODO: Show previous answers (expandable); previous-answer directive.  Answers needs to be SHOWable.

// Choose from among multiple problems
app.directive('ximera-shuffle', function () {
    return {
        controller: "shuffleController",
        restrict: 'A',
        scope: {}
        template: "<div><ng-transclude></ng-transclude></div>",
        link: function($scope, element, attrs, controller) {
        }
        // TODO: Hide all but one at a time.  Randomly choose which to show next.
        // TODO: On correct answer, hide previous one with expand option, show next one.
    };
}


// For now, use this as directive function for questions, explorations, and exercises.
function questionDirective () {
    return {
        controller: "questionController",
        restrict: 'A',
        scope: {},
        template: "<div><ng-transclude></ng-transclude></div>",
        link: function($scope, element, attrs, controller) {
        }
    }
}

app.directive('ximera-question', func)

app.directive('shuffleController', function () {

});

//  Multiple choice:
// TODO: Display multiple choice form.
// TODO: Count correct answer.