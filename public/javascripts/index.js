$(function() {
    var callout = $("#myCarousel");
    
    callout.css('background','black');

    callout.children().css('z-index',50);
    
    for (var i = 0; i < 30; i++) {
	callout.append('<div class="eks">X</div>');
    }

    callout.css('overflow', 'hidden');
    
    $( '.eks' ).each(function( index ) {
	
	function start( element ) {
	    var width = callout.width();
	    var height = callout.outerHeight();
	    
	    $(element).css({
		position: 'absolute',
		color: 'white',
		fontSize: 200 + 0.5 * Math.random() * height,
		fontWeight: 800,
		opacity: 0.15 + 0.10 * Math.random(),
		zIndex: 10,
		'-webkit-user-select': 'none',
		'-moz-user-select': 'none',
		'-ms-user-select': 'none',
		'user-select': 'none',
		'-o-user-select': 'none'
	    });
	    
	    var eksWidth = $(element).width();
	    var eksHeight = $(element).outerHeight();

	    var left = 0;
	    var top = 0;
	    var finishLeft = 0;
	    var finishTop = 0;

	    if (Math.random() > 0.5) {
		top = Math.random() * height;
		finishTop = Math.random() * height;		    
		
		if (Math.random() > 0.5) {
		    left = -eksWidth;
		    finishLeft = width;
		} else {
		    left = width;
		    finishLeft = -eksWidth;
		}
	    } else {
		left = Math.random() * width;
		finishLeft = Math.random() * width;

		if (Math.random() > 0.5) {
		    top = -eksHeight;
		    finishTop = height;
		} else {
		    top = height;
		    finishTop = -eksHeight;
		}		
	    }

	    if ($(element).attr('data-repeated')) {
		$(element).css({
		    left : left,
		    top : top
		});
	    } else {
		$(element).css({
		    left : Math.random() * width,
		    top : Math.random() * height
		});
		
		$(element).attr('data-repeated', true );
	    }
	    

	    $(element).transition({ left: finishLeft,
				    top: finishTop
				  },
				  10000 + 50000 * Math.random(),
				  function() {
				     start(this);
				  }
				  /*
				{ duration: 20000 + 30000 * Math.random(),
				 easing: 'linear',
				 done: function() {
				     start(this);
				 }*/
			       );
	}

	start(this);
	
    });
});
