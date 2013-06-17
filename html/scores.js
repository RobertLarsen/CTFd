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
