$(function() {
    var ShowData = function(data) {
        var counter = 0;
        $.plot(
            "#steals_per_service", data.steals_per_service, {
                xaxis : {
                    ticks : _.chain(data.steals_per_service)
                             .map(function(d) {
                                 return [
                                    (counter++) + 0.5,
                                    d.label
                                 ];
                             }).value()
                    
                },
                legend : {
                    show : false
                }
            }
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
