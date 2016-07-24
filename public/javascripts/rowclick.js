var $ = require('jquery');

// transforms any bootstrap table row that has data-href attribute set into a clickable element
exports.addClickableTableRows = function() {
    $('.table tr[data-href]').each(function(){
        $(this).css('cursor','pointer').hover(
            function(){ 
                $(this).addClass('active'); 
            },  
            function(){ 
                $(this).removeClass('active'); 
            }).click( function(){ 
                document.location = $(this).attr('data-href'); 
            }
        );
    });
};

