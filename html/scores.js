$(function() {
    var ShowData = function(data) {
            var tableData = '',
            T = function(text) {
                return '<td>' + $('<div>').text(text).html() + '</td>';
            };
            if (data) {
                _.chain(data.graphs)
                 .keys()
                 .forEach(function(name) {
                     $.plot('.' + name,
                            data.graphs[name].data,
                            data.graphs[name].options
                     );
                });

                _.chain(data.table).keys().forEach(function(team) {
                    var entry = data.table[team];
                    tableData += '<tr>' + T(team) + T(entry.deliver) + T(entry.defend) + T(entry.check) + T(entry.capture) + T(entry.challenge) + T(entry.points) + '</tr>';
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

    setInterval(Update, 30000);
    Update();
});
