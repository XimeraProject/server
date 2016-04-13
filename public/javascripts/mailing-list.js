var $ = require('jquery');

$(document).ready(function() {
    $('#mailingListAlert').hide();

    $("#mailingListSubmit").click( function(event) {
	var emailAddress = $("#mailingListEmail").val();
	$("#mailingListEmail").val("");

	$.ajax({
	    url: "/mailing-list",
	    data: {"email": emailAddress},
	}).done(function(data) {
	    $('#mailingListAlert').show();
	    $('#mailingListAlert').fadeOut(2000);
	    $("#mailingListEmail").val("");
	});

	return false;
    });
});
