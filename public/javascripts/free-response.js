var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

window.Markdown = require('pagedown-converter');
var Converter = Markdown.Converter;
var Sanitizer = require('pagedown-sanitizer').getSanitizingConverter;
var editor = require('pagedown-editor');

var createFreeResponse = function() {
    var element = $(this);

    var wmdName = "-" + $(this).attr('id');
    
    var formHtml = '<div class="wmd-panel compose">' +
	    '<div id="wmd-button-bar' + wmdName + '"></div>' + 
	    '<textarea class="content form-control" rows="5" id="wmd-input' + wmdName + '" name="content"/>' + 
	    '<div id="wmd-preview' + wmdName + '" class="wmd-panel wmd-preview"></div>' +
	    //'<div class="model-solution" ng-show="db.viewSolution" ng-bind-html="htmlSolution"></div>' +
	    '</div>';
    
    var form = $(formHtml);
    $(element).append( form );
    
    var textarea = $('textarea',element);
    
    var converter = Sanitizer();
    var editor = new Markdown.Editor(converter, wmdName);
    
    editor.hooks.chain("onPreviewRefresh", function () {
	/*
	 MathJax.Hub.Queue(
	 ["Typeset",MathJax.Hub, $('.wmd-preview' + wmdName).get(0)]
    	 );
	 */
    });
    
    // update database from view
    $(textarea).on("keyup change input propertychange", function (e) {
	$(element).persistentData( 'response', $(textarea).val() );
    });
    
    $(element).persistentData( function(event) {
	if ('response' in event.data)		
	    $(textarea).val( event.data['response'] );
    });
    
    // run should be called after you've added your plugins to the editor (if any).
    editor.run();
    
    var toolbar = $('#wmd-button-row' + wmdName, form);
    //toolbar.append( $('<div class="btn-group"><button class="btn btn-primary"><i class="fa fa-share"></i>&nbsp;Submit to Peers</button><button class="btn btn-warning"><i class="fa fa-thumbs-up"></i>&nbsp;Review Peers</button></div>') );
    /*
     var button = '<button class="btn btn-info" ng-click="db.viewSolution = true;" ng-hide="db.viewSolution"><i class="fa fa-eye"></i>&nbsp;View model solution</button><button class="btn btn-info" ng-click="db.viewSolution = false;" ng-show="db.viewSolution"><i class="fa fa-eye-slash"></i>&nbsp;Hide model solution</button>';
     toolbar.append( $(button) );
     */
    
    // Remove the "add image" button since it is broken
    $('#wmd-image-button' + wmdName).remove();
};

$.fn.extend({
    freeResponse: function() {
	return this.each( createFreeResponse );
    }
});

