var _ = require('underscore');

module.exports = function (router, db, teams, services) {
    router.get('/viz.json', function(req, res) {
        var result = {
                teams : teams,
                services : services,
                events : [ ]
            };
    
        res.writeHead(200, {'Content-Type' : 'application/json'});
        db.flags.find().forEach(function(err, doc) {
            if (err === null) {
                if (doc) {
                    //First the flag delivery
                    result.events.push({
                        type : 'deliver',
                        time : doc.time,
                        team : doc.team,
                        service : doc.service,
                        success : doc.delivered
                    });

                    //Then captures
                    _.forEach(doc.captures, function(cap) {
                        result.events.push({
                            type : 'capture',
                            time : cap.time,
                            team : cap.team,
                            service : doc.service,
                            victim : doc.team
                        });
                    });

                    //Then checks
                    _.forEach(doc.checks, function(check) {
                        result.events.push({
                            type : 'check',
                            time : check.time,
                            team : doc.team,
                            service : doc.service,
                            success : check.result
                        });
                    });
                } else {
                    result.events.sort(function(a, b) { return a.time - b.time; });
                    res.end(JSON.stringify(result, null, 4));
                }
            }
        });
    });
};
