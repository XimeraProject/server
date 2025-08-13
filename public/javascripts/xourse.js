var $ = require('jquery');
var _ = require('underscore');
var Isotope = require('isotope-layout');

var activityCard = require('./activity-card');
var xourseIsotope = undefined;
var layoutMode = 'fitRows';
var search = undefined;

var filtering = function() {
	if ((typeof search === 'undefined') || (search.length == 0))
		return $(this).hasClass('part') || $('.part').eq($(this).attr("data-part-counter") - 1).hasClass('part-open') 
	else {
		var regexps = _.map(search.toLowerCase().split(" "), function (word) {
			return new RegExp(word);
		});
		if ($(this).hasClass('part'))
			return true;

		if (!$('.part').eq($(this).attr("data-part-counter") - 1).hasClass('part-open'))
			return false

		var text = $(this).text().toLowerCase();

		return _.all(regexps, function (re) { return re.test(text); });
	}
}

var updateSearch = function() {
    if (!xourseIsotope) return;
    xourseIsotope.arrange({ filter: filtering });   
};

var layoutXourse = function( ) {
    var xourse = $(this);
    // console.log('layoutXourse for ');
    // console.log(xourse);

    $('.activity-card', xourse).activityCard();

	xourse.find('.part').each(function (index, value) {
		$(this).click(function () {
			$(value).toggleClass('part-open')
			xourseIsotope.arrange({ filter: filtering });
		})
	})


	/* make sure the part with the current activity is open */
	document.querySelectorAll('.activity-card.active').forEach(function(crd) {
			$('.part').eq($(crd).attr("data-part-counter") - 1).addClass('part-open');
	})  	
	
	xourse.show();
    
    var options = {
	// layoutMode: 'fitRows',
	// layoutMode: 'vertical',
	layoutMode: layoutMode,
	itemSelector: '.activity-card',
	filter: filtering,
	animationOptions: {
	    duration: 750,
	    easing: 'linear',
	    queue: false
	}
    };

    xourseIsotope = new Isotope( xourse.get(0),
				 options );
};

// On document ready...
$(function() {
	$('#xourse-expand').click(function(){
		$('.part').addClass('part-open')
		$('#xourse-implode').show()
		$('#xourse-expand').hide()
		xourseIsotope.arrange({ filter: filtering });
	})
	
	$('#xourse-implode').click(function () {
		$('.part').removeClass('part-open')
		$('#xourse-implode').hide()
		$('#xourse-expand').show()
		xourseIsotope.arrange({ filter: filtering });
	})

	var mainnav=$('.main-nav')[0];
	
	// If no toc present, hide it (otherwise empty space at left side of page)
	if ( $('.main-nav').length > 0 && ! mainnav.contains(mainnav.querySelector('.toc')) ) {
	           mainnav.classList.add("hidden");
		   // Hide now useless 'Toon/Verberg vooruitgang' button
                   $("#xmprogess-close").addClass("xmprogresshidden");
                   $("#xmprogess-open").addClass("xmprogresshidden");
	}

	// TOC toggle (main-nav)
	$('#toc-expand-btn').click(function(){
	        if (mainnav.classList.contains("hidden")) {
		   // Nav was hidden: remove "hidden" to show it again
	           mainnav.classList.remove("hidden");
		   // Hide progress, and show 'Toon vooruitgang' button
                   $("#xmprogess-open").removeClass("xmprogresshidden");
                   $(".progress").addClass("xmprogresshidden");
		} else {
		   // Nav was shown: hide it by adding class  "hidden" 
	           mainnav.classList.add("hidden");
		   // Hide now useless 'Toon/Verberg vooruitgang' button
                   $("#xmprogess-close").addClass("xmprogresshidden");
                   $("#xmprogess-open").addClass("xmprogresshidden");
	        }
	})
	// TOC toggle (progress)
	$('.xmhideprogress').click(function(){
           if ($("#xmprogess-close").hasClass("xmprogresshidden")) {
               $("#xmprogess-close").removeClass("xmprogresshidden");
               $("#xmprogess-open").addClass("xmprogresshidden");
               $(".progress").removeClass("xmprogresshidden");
           } else {
               $("#xmprogess-open").removeClass("xmprogresshidden");
               $("#xmprogess-close").addClass("xmprogresshidden");
               $(".progress").addClass("xmprogresshidden");
           }
	})

	// Menu toggle
	$('.toggle').click(function(){
           if ($(".item").hasClass("active")) {
               $(".item").removeClass("active");
           } else {
               $(".item").addClass("active");
           }
	})



    layoutMode = 'fitRows';
    $('.xourse').each( layoutXourse );

    layoutMode='vertical';
    $('.toc').each( layoutXourse );

    $('.xourse-search').on('input', function(e) {
		$('#xourse-clear').show();
		$('#xourse-search').hide();
		search = $(e.target).val();
		updateSearch();
    });
	
    $('#xourse-clear').click(function(e) {
		$('.xourse-search').val('');
		$('#xourse-clear').hide();
		$('#xourse-search').show();
		search = "";
		updateSearch();
    });
});

