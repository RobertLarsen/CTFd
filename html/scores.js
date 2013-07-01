$(function() {
    var lastData = null,
        large = null,
        ShowData = function(data) {
            lastData = data;
            if (data) {
                _.chain(data)
                 .keys()
                 .forEach(function(name) {
                     $.plot('.' + name,
                            data[name].data,
                            data[name].options
                     );
                });
            }
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
