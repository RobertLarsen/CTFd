$(function() {
    var ShowData = function(data) {
        var counter = 0;
        $.plot(
            "#steals_per_service",
            data.steals_per_service.data,
            data.steals_per_service.options
        );

        $.plot(
            "#steals_losses_per_team",
            data.steals_losses_per_team.data, 
            data.steals_losses_per_team.options
        );
    };

    var UpdateGraphs = function() {
        $.ajax('/scores.json', {
            cache : false,
            success : ShowData
        });
    };

    //setInterval(UpdateGraphs, 1000);
    UpdateGraphs();
});
