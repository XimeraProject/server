var _ = require('underscore');

function readIfNoneMatch( req ) {
    var header = req.get('If-None-Match');
    
    if (!header) return [];
    // Ignore the weakness of any tags
    header = header.replace( /W\/\"/, "\"" );
    
    try {
        return JSON.parse("[" + header + "]");
    } catch(e) {
	return [header];
    }
}

exports.checkIfNoneMatch = function( req, res, etag, callback ) {
    // If the requester claims to already have our hash...
    if (_.some( readIfNoneMatch(req), h => h == etag )) {
	// Then tell the browser that they're good to go.
	res.set({ 'ETag': '"' + etag + '"' });	    
	res.sendStatus(304);
	return;
    }

    // If not, call the callback to expensively recreate our content...
    callback( function( res ) {
	// And help the callback to set the etag
	res.set({ 'ETag': '"' + etag + '"' });
	res.set('Cache-Control', 'must-revalidate, max-age=600');
    });
}
