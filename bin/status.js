var http = require('http'),
    fs = require('fs'),
    mongojs = require('mongojs'),
    router = require('choreographer').router(),
    conf = JSON.parse(
        fs.readFileSync(process.argv.length > 2 ? 
            process.argv[2] : 'config.js', 'utf-8')
    ),
    db = mongojs.connect(conf.database, ['flags']);

router.get('/status.json', function(req, res) {
    var result = {};

    res.writeHead(200, {'Content-Type' : 'application/json'});
    db.flags.find({active:true}).forEach(function(err, doc) {
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

router.get('/status.html', function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync('html/status.html'));
});

router.get('/status.js', function(req, res) {
    res.writeHead(200, {'Content-Type' : 'application/javascript'});
    res.end(fs.readFileSync('html/status.js'));
});

router.get('/status.css', function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/css'});
    res.end(fs.readFileSync('html/status.css'));
});

http.createServer(router).listen(conf.status_port);
