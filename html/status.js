$(function() {
    var MakeTable = function(teams, services, callback) {
        var html = '<table><thead class="strong"><tr><td></td>';
        _.forEach(teams, function(team) {
            html += '<td>' + team + '</td>';
        });
        html += '</tr></thead>';

        html += '<tbody>';
        _.forEach(services, function(service) {
            html += '<tr><td class="strong">' + service + '</td>';
            _.forEach(teams, function(team) {
                var res = callback(team, service),
                    color = (res === null ? 'yellow' : res === true ? 'green' : 'red');
                html += '<td class="' + color + '"></td>';
            });
            html += '</tr>';
        });
        html += '</tbody>';

        return html;
    };
    var SetData = function(data) {
        var teams = _.keys(data).sort(),
            services = _.chain(data).values()
                            .map(function(o) {
                                return _.keys(o);
                            })
                            .reduce(function(o, context) {
                                _.forEach(o, function(n) {
                                    context.push(n);
                                });
                                return context;
                            }, [])
                            .uniq()
                            .value().sort();

        $('#delivery').html(
            MakeTable(teams, services, function(team, service) {
                return data[team] && data[team][service] && data[team][service].delivered;
            })
        );

        $('#check').html(
            MakeTable(teams, services, function(team, service) {
                return data[team] && data[team][service] && data[team][service].check;
            })
        );

        $('#defend').html(
            MakeTable(teams, services, function(team, service) {
                return data[team] && data[team][service] && !data[team][service].captured;
            })
        );
    };

    var UpdateTables = function() {
        $.ajax('/status.json', {
            cache : false,
            success : SetData
        });
    };

    setInterval(UpdateTables, 1000);
    UpdateTables();
});
