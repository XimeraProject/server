var cheerio = require('cheerio');
var repositories = require('./repositories');
var cachify = require('./cachify');

// this is what really should be cached -- and it can be safely cached
// forever because the blob is immutable
exports.parseActivityBlob = function( repositoryName, blobHash, callback ) {
    cachify.json( "metadata:" + blobHash,
	     function(callback) {
		 repositories.readBlob( repositoryName, blobHash )
		     .then( function(source) {
			 var activity = { kind: 'activity' };
			 var $ = cheerio.load( source, {xmlMode: true} );

			 var isXourse = $('meta[name="description"]').attr('content') == 'xourse';

			 if (isXourse) {
			     activity = parseXourseDocument( $ );
			 } else {
			     $('a').each( function() {
				 if ($(this).attr('id'))
				     $(this).remove();
			     });
			     
			     activity.title = $('title').html();
			     activity.html = $('body').html();
			     activity.hash = blobHash;
			     activity.description = $('div.abstract').html();
			 }
			 
			 callback(null, activity);
		     })
		     .catch( function(err) {
			 callback(err);
		     });
	     },
	     callback );
};

function parseXourseDocument( $ ) {
    var xourse = { kind: 'xourse' };
    xourse.activityList = [];
    xourse.activities = {};

    // Read logo
    var logo = $('meta[name="og:image"]').attr('content');
    if ((logo) && (logo.length > 0))
	xourse.logo = logo;
    
    $('.activity').each( function() {
	$(this).attr('data-weight','1');
    });

    $('.graded').each( function() {
	var graded = $(this);

	var total = 0;
	$(this).children( '[data-weight]' ).each( function() {
	    var child = $(this);
	    total = total + parseInt( child.attr('data-weight') );
	});

	graded.attr( 'data-weight-children', total );
    });
    
    $('.card').each( function() {
	var card = {};

	var element = $(this);

	var weight = 1.0;
	element.parents( '.graded' ).each( function() {
	    var parent = $(this);
	    if (parseFloat(parent.attr('data-weight-children')) != 0) {
		weight = weight * parseFloat(parent.attr('data-weight')) / parseFloat(parent.attr('data-weight-children'));
	    } else {
		weight = 0.0;
	    }
	});
	card.weight = weight;
	
	card.title = $('h2',this).html();
	if (card.title === null) {
	    card.title = element.html();
	}
	
	card.summary = $('h3',this).html();
	card.cssClass = element.attr('class').replace('activity','');
	    
	// BADBAD: these hashes need to be found, or we need to
	// replace how we store progress
	card.hashes = [];
	
	card.href = element.attr('href');
	if (card.href === undefined) {
	    card.href = '#' + element.attr('id');
	}

	xourse.activities[card.href] = card;
	xourse.activityList.push( card.href );
    });

    xourse.totalPoints = 0.0;
    $('[data-weight]:not([data-weight] [data-weight])').each( function() {
	xourse.totalPoints = xourse.totalPoints + parseFloat($(this).attr('data-weight'));
    });
    
    xourse.title = $('title').html();
    xourse.html = $('body').html();

    return xourse;
}

// these should also be cached
exports.parseXourseBlob = function( repositoryName, blobHash, callback ) {
    cachify.json( "metadata:" + blobHash,
	     function(callback) {
		 repositories.readBlob( repositoryName, blobHash )
		     .then( function(source) {

			 var $ = cheerio.load( source, {xmlMode: true} );
			 var xourse = parseXourseDocument( $ );
			 callback(null, xourse);
		     })
		     .catch( function(err) {
			 callback(err);
		     });
	     },
	     callback );
};
