define(['require', "eonasdan-bootstrap-datetimepicker"], function(require) {
    var $ = require('jquery');
    var ui = require('jquery-ui');
    var moment = require('moment');

    // jsfiddle which updates all relative dates defined by <time class='relative-date'>
    var updateAllRelativeDates = function() {
        $('time').each(function (i, e) {
            if ($(e).attr("class") == 'absolute-date') {
                var time = moment(new Date($(e).attr('datetime')));
                $(e).html('<span>' + time.format('MMMM D, YYYY') + '</span>');		
	    }
	    
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
	$("#datepicker").datetimepicker({
	    format: "MMMM D, YYYY",
	    icons: {
		time: "fa fa-clock-o",
		date: "fa fa-calendar",		
		up: "fa fa-arrow-up",
		down: "fa fa-arrow-down",
		previous: "fa fa-arrow-left",
		next: "fa fa-arrow-right",		
	    }
	});
	
	// Update all dates
	updateAllRelativeDates();

	// Update dates every minute
	setInterval(updateAllRelativeDates, 60000);
	
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
