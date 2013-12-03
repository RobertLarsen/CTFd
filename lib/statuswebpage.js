module.exports = function (router, db, daemon) {
    router.get('/status.json', function(req, res) {
        var result = {};
    
        res.writeHead(200, {'Content-Type' : 'application/json'});
        db.flags.find({time:daemon.latestPlantTime}).forEach(function(err, doc) {
            if (err === null) {
                if (doc) {
                    if (result[doc.team] === undefined) {
                        result[doc.team] = {};
                    }
                    result[doc.team][doc.service] = {
                        delivered : doc.delivered,
                        check : (doc.checks.length === 0 ? null : doc.checks[doc.checks.length - 1].result),
                        captured : doc.captures.length > 0
                    };
                } else {
                    res.end(JSON.stringify(result, null, 4));
                }
            }
        });
    });
};
