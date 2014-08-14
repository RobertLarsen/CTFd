$(function() {
    setTimeout(function() {
        var name = prompt("May I have your name please?");
        $('.pill').click(function() {
            var color = $(this).hasClass('red') ? 0 : 1;
            $.ajax({
                url : '/take',
                type : 'POST',
                data : {
                    name : name,
                    pill : color
                },
                success : function() {
                    $('.pill').remove();
                    $.ajax({
                        url : '/distribution',
                        type : 'GET',
                        success : function(data) {
                            var sum = data.red + data.blue,
                                redPercent = Math.round(data.red / sum * 100),
                                bluePercent = 100 - redPercent;

                            $('body').append(
                                '<div class="pill red">' + redPercent + '%</div>' +
                                '<div class="pill blue">' + bluePercent + '%</div>'
                            );
                        }
                    });
                }
            });
        });
    }, 500);
});
