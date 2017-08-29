$(function() {
    $('.chat').on('click', function() {
	$('.chat-body').show();
    });
    
    $('.chat .close').on('click', function() {
	$('.chat-body').hide();
	return false;
    });
});

module.exports.onSendMessage = function( callback ) {
    $('.chat input').keypress(function (event) {
        if (event.which == 13) {
	    module.exports.appendToTranscript( 'me', $(this).val() );
	    callback( $(this).val() );
	    $(this).val('');
	    return false;
        }
    });
};

module.exports.appendToTranscript = function( name, text, other ) {
    $('.chat').show();
    $('.chat-body').show();
    
    var nameTag = $('<dt></dt>');
    nameTag.text(name);
    var textTag = $('<dd></dd>');
    textTag.text(text);    

    if (other) {
	nameTag.addClass('other');
	textTag.addClass('other');
    }
    
    $('.chat .transcript').append( nameTag );
    $('.chat .transcript').append( textTag );    

    $('.transcript').scrollTop($('.transcript')[0].scrollHeight);
    
    return;
};

