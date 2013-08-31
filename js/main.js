$('.active').live('mouseenter', function(){
    mouseOverActiveElement = true; 
}).live('mouseleave', function(){ 
    mouseOverActiveElement = false; 
});

$("html").click(function(){ 
    if (!mouseOverActiveElement) {
        console.log('clicked outside active element');
    }
});
