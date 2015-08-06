define(['require', 'x-editable'], function(require) {
    var $ = require('jquery');
    var ui = require('jquery-ui');
    var moment = require('moment');

    // Use Font Awesome instead of Glyphicons (which are somewhat broken in Bootstrap 3, apparently?)
    $.fn.editableform.buttons =
	'<button type="submit" class="btn btn-primary btn-sm editable-submit">'+
	'<i class="fa fa-fw fa-check"></i>'+
	'</button>'+
	'<button type="button" class="btn btn-default btn-sm editable-cancel">'+
	'<i class="fa fa-fw fa-times"></i>'+
	'</button>';

    // Default to inline x-editables instead of pop-ups
    // $.fn.editable.defaults.mode = 'inline';
    
    // jsfiddle which updates all relative dates defined by <time class='relative-date'>
    var updateAllRelativeDates = function() {
        $('time').each(function (i, e) {
            if ($(e).attr("class") == 'relative-date') {
		
                // Initialise momentjs
                var now = moment();
		
                moment.locale('en', {
                    calendar : {
                        lastDay : '[Yesterday at] LT',
                        sameDay : '[Today at] LT',
                        nextDay : '[Tomorrow at] LT',
                        lastWeek : '[Last] dddd [at] LT',
                        nextWeek : 'dddd [at] LT',
                        sameElse : 'D MMM YYYY [at] LT'
                    }
                });

                // Grab the datetime for the element and compare to now                    
                var time = moment(new Date($(e).attr('datetime')));
                var diff = now.diff(time, 'days');

                // If less than one day ago/away use relative, else use calendar display
                if (diff <= 1 && diff >= -1) {
                    $(e).html('<span>' + time.from(now) + '</span>');

		    // Add tooltip with missing information for relative dates
		    $(e).tooltip({
			'show': true,
			'placement': 'right',
			'title': time.calendar()
		    });
                } else {
                    $(e).html('<span>' + time.calendar() + '</span>');
                }
		
	    }
        });
    };

    $(document).ready(function() {
	// Update all dates
	updateAllRelativeDates();

	// Update dates every minute
	setInterval(updateAllRelativeDates, 60000);
	
	$('.x-editable').attr( "data-url", function() {
	    return "/users/" + $(this).attr("data-pk");
	});

	$('.x-editable').editable({ajaxOptions: {type: 'put'}});

	var updateLinkedAccountButtons = function() {
	    $('.linked-account[connected]').switchClass('btn-default', 'btn-danger');
	    $('.linked-account:not([connected])').switchClass('btn-danger', 'btn-default');

	    $('.linked-account[connected] .connect').hide();
	    $('.linked-account[connected] .disconnect').show();

	    $('.linked-account:not([connected]) .connect').show();
	    $('.linked-account:not([connected]) .disconnect').hide();
	};

	updateLinkedAccountButtons();
	
	$('.linked-account').click( function() {
	    var button = this;
	    
	    if ($(button).attr("connected")) {
		$.ajax({
		    url: '/users/' + $(button).attr("userId") + '/' + $(button).attr("id"),
		    type: 'DELETE',
		    success: function(result) {
			console.log( "linked-account click result = ", result );
			$(button).removeAttr("connected");
			updateLinkedAccountButtons();			
		    }
		});
	    } else {
		window.location.href = "/auth/" + $(this).attr("id");
	    }
	});
    });

});
