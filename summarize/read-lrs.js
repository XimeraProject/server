var fs        = require("fs");
var snappy = require('snappy');
var async = require('async');
var buffer24        = require("buffer24");
var uint32 = require('uint32');
var crc32 = require('fast-crc32c');

function processLearningRecords( filename, position, loop, callback ) {
    fs.open(filename, fs.constants.O_RDONLY, function(err, fd) {
	if (err) {
	    callback(err);
	} else {
	    async.forever(
		function(next) {
		    var headerBuffer = Buffer.alloc(4);
		    fs.read( fd, headerBuffer, 0, 4, position, function(err, bytesRead, lengthBuffer) {
			if (err) {
			    next(err);
			} else {
			    if (bytesRead != 4) {
				next('end of file');
			    } else {
				var kind = headerBuffer.readUInt8(0);		
				var length = lengthBuffer.readUInt24LE(1);
				var buffer = Buffer.alloc(length);
				
				fs.read( fd, buffer, 0, length, position + 4, function(err, bytesRead, buffer) {
				    position = position + 4 + length;
				    if (err) {
					next(err);
				    } else {
					if (bytesRead != length) {
					    next('end of file');
					} else {
					    if (kind != 0) {
						next(null);
					    } else {
						snappy.uncompress(buffer.slice(4), { asBuffer: false }, function (err, original) {
						    if (err) {
							next(err);
						    } else {
							var checksum = crc32.calculate(original, 0);
							var maskedChecksum = uint32.addMod32( uint32.rotateRight(checksum, 15), 0xa282ead8 );
							var recordedChecksum = buffer.readUInt32LE(0);
							if (maskedChecksum != recordedChecksum) {
							    next('incorrect checksum');
							} else {
							    // should also send file offset
							    loop( JSON.parse(original),
								  next );
							}
						    }
						});
					    }
					}
				    }
				});
			    }
			}
		    });
		},
		function(err) {
		    if (err == 'end of file')
			callback(null, position);
		    else
			callback(err, position);
		});
	}
    });
}

exports.read = processLearningRecords;

/*
processLearningRecords( "repositories/sample.git/learning-record-store", 0,
			function( entry, callback ) {
			    console.log(entry);
			    callback(null);
			},
			function(err, position) {
			    if (err) {
				console.log(err);
			    } else {
				console.log("done at", position);
			    }
			});
*/
