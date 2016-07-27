var $ = require('jquery');
var _ = require('underscore');
var database = require('./database');

var buttonHtml = '<button class="btn btn-info btn-xs btn-hint-collapse" type="button" aria-expanded="false" aria-controls="collapse"><i class="fa fa-chevron-down"/></button>';

var createFoldable = function() {
    var foldable = $(this);
    
    var button = $(buttonHtml);
    foldable.before('<div class="clearfix"></div>');
    foldable.before(button);

    button.click( function() {
	if (foldable.persistentData( 'collapsed' )) {
	    foldable.persistentData( 'collapsed', false );
	} else {
	    foldable.persistentData( 'collapsed', true );
	}
    });
    
    foldable.persistentData( function(event) {
	if ( (foldable.persistentData( 'collapsed' ) == true) != (foldable.attr('data-original') == 'expandable') ) {
	    button.find('i').addClass('fa-rotate-90');
	    //foldable.collapse('hide');
	    foldable.css( 'font-size', '0px' );
	    foldable.children().hide();
	    $('.unfoldable', foldable).show();
	    $('.unfoldable', foldable).parentsUntil( foldable ).show();
	    $('.foldable', foldable).hide();	    
	} else {
	    button.find('i').removeClass('fa-rotate-90');
	    foldable.children().show();
	    //$('.unfoldable', foldable).show();	    
	    //foldable.collapse('show');
	    foldable.css( 'font-size', '12pt' );
	    $('.foldable', foldable).show();
	}

    });

};

$.fn.extend({
    foldable: function() {
	return this.each( createFoldable );
    }
});    
