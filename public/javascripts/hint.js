var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

var buttonHtml = '<button class="btn btn-info btn-xs btn-hint-collapse" type="button" aria-expanded="false" aria-controls="collapse"><i class="fa fa-chevron-down"/></button>';

var createHint = function() {
    var hint = $(this);

    hint.addClass('collapse');
    hint.collapse('hide');

    var button = $(buttonHtml);
    hint.before(button);

    button.click( function() {
	if (hint.persistentData( 'collapsed' )) {
	    hint.persistentData( 'collapsed', false );
	} else {
	    hint.persistentData( 'collapsed', true );
	}
    });

    hint.trigger( 'ximera:register-hint' );
    
    hint.persistentData( function(event) {
	if (hint.persistentData( 'available' )) {
	    button.show('fast');
	    
	    if (hint.persistentData( 'collapsed' )) {
		button.find('i').addClass('fa-rotate-90');
		hint.collapse('hide');
	    } else {
		button.find('i').removeClass('fa-rotate-90');
		hint.collapse('show');
	    }
	} else {
	    hint.collapse('hide');
	    button.hide();
	}
	/*
	 if (hint.persistentData( 'available' )) {

	 } else {
	 button.hide();
	 }
	 */

    });
    

};

$.fn.extend({
    hint: function() {
	return this.each( createHint );
    }
});    


