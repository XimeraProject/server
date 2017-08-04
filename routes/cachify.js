var redis = require('redis');

// create a new redis client and connect to our local redis instance
var client = redis.createClient();

// if an error occurs, print it to the console
client.on('error', function (err) {
    console.log("Error " + err);
});

exports.json = function( key, f, callback ) {
    client.get(key, function(err, result) {
	if (err) {
	    callback(err);
	} else {
	    if (result) {
		callback( null, JSON.parse(result) );
	    } else {
		f( function(err, result) {
		    if (err) {
			callback( err );
		    } else {
			client.set( key, JSON.stringify(result) );
			callback( null, result );
		    }
		});
	    }
	}
    });
};

exports.string = function( key, f, callback ) {
    client.get(key, function(err, result) {
	if (err) {
	    callback(err);
	} else {
	    if (result) {
		callback( null, result );
	    } else {
		f( function(err, result) {
		    if (err) {
			callback( err );
		    } else {
			client.set( key, result );
			callback( null, result );
		    }
		});
	    }
	}
    });
};
