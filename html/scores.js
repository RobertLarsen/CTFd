$(function() {
    var lastData = null,
        large = null,
        ShowData = function(data) {
            var tableData = '';
            lastData = data;
            if (data) {
                _.chain(data.graphs)
                 .keys()
                 .forEach(function(name) {
                     $.plot('.' + name,
                            data.graphs[name].data,
                            data.graphs[name].options
                     );
                });

                _.forEach(data.table, function(entry) {
                    tableData += '<tr><td>' + $('<div>').text(entry.team).html() + '</td><td>' + entry.score + '</td></tr>';
                });

                $('.table_scores tbody').html(tableData);
            }
        };

    var Update = function() {
        $.ajax('/scores.json', {
            cache : false,
            success : ShowData
        });
    };

    //setInterval(Update, 1000);
    Update();
});
