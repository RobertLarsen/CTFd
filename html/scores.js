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

                _.chain(data.table)
                 .keys()
                 .map(function(team) {
                     return {
                         name : team,
                         data : data.table[team]
                     };
                 })
                 .sort(function(t1, t2) {
                     return t2.data.points - t1.data.points;
                 })
                 .forEach(function(team) {
                    tableData += '<tr>' + T(team.name) + T(team.data.deliver) + T(team.data.defend) + T(team.data.check) + T(team.data.capture) + T(team.data.challenge) + T(team.data.points) + '</tr>';
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
