$(function() {
    $("input[type=text]").val('');
    $("input:radio:first").click();

    $("#search_div").show();
    $("#add_div").fadeTo(0, 0);

    $("#search_div>form").submit(function() {
        $("#result_div").hide('fast');
        $.ajax({
            url: '/cgi-bin/search',
            dataType: 'html',
            data: {
                name: $("#search_div").find("input").val()
            },
            success: function(data) {
                $("#result_div").html(data).show('slow');
            }
        });
        $("input[type=text]").val('');
        return false;
    });

    $("#add_div>form").submit(function() {
        $.ajax({
            url: '/cgi-bin/add',
            dataType: 'html',
            data: {
                name: $("#add_div").find("input:eq(0)").val(),
                description: $("#add_div").find("input:eq(1)").val()
            },
            success: function(data) {
                $("#result_div").html(data).show('slow');
            }
        });
        $("input[type=text]").val('');
        return false;
    });

    $("input:radio").click(function() {
        $("input[type=text]").val('');
        $("#result_div").hide('fast');
    });
    $("input:radio:first").click(function() {
        $("#add_div").fadeTo('slow', 0, function() {
            $("#add_div").hide();
            $("#search_div").show();
            $("#search_div").fadeTo('slow', 1);
        });
    });
    $("input:radio:last").click(function() {
        $("#search_div").fadeTo('slow', 0, function() {
            $("#search_div").hide();
            $("#add_div").show();
            $("#add_div").fadeTo('slow', 1);
        });
    });
});
