$(function() {
    var limitString = function(str, len) {
        if (str.length > len) {
            str = str.substring(0, len - 3) + '...';
        }
        return str;
    };
    var ShowData = function(data) {
            var tableData = '',
            T = function(text) {
                return '<td>' + $('<div>').text(text).html() + '</td>';
            };
            if (data) {
                _.chain(data.graphs)
                 .keys()
                 .forEach(function(name) {
                     _.each(data.graphs[name].data, function(e) {
                         e.label = limitString(e.label, 16);
                     });

                     if (data.graphs[name].options.xaxis) {
                        _.each(data.graphs[name].options.xaxis.ticks, function(t) {
                            t[1] = limitString(t[1], 16);      
                        });
                     }
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
