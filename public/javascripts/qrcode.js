var $ = require('jquery');
var QRCode = require('qrcode');

function addQRCode() {
    var QRCodeDraw = new QRCode.QRCodeDraw();
    var canvas = $(this)[0];
    
    QRCodeDraw.draw(canvas, $(this).attr('data-href'), function (error, canvas) {
	if (error)
	    console.error(error);
    });
}

$.fn.extend({
    qrcode: function() {
	return this.each( addQRCode );
    }
});
