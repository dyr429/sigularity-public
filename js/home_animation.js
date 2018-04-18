$(document).ready(function() {
    var icon = $('.play');
    icon.click(function() {
        icon.toggleClass('active');
        return false;
    });
});

$('.card').click(function(){
    $(this).toggleClass('flipped');
});