var http = require('http'),
    fs = require('fs'),
    _ = require('underscore'),
    mongojs = require('mongojs'),
    router = require('choreographer').router(),
    conf = JSON.parse(
        fs.readFileSync(process.argv.length > 2 ? 
            process.argv[2] : 'config.js', 'utf-8')
    ),
    db = mongojs.connect(conf.database, ['flags']);

router.get('/scores.html', function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.end(fs.readFileSync('html/scores.html'));
});

router.get('/scores.js', function(req, res) {
    res.writeHead(200, {'Content-Type' : 'application/javascript'});
    res.end(fs.readFileSync('html/scores.js'));
});

router.get('/scores.css', function(req, res) {
    res.writeHead(200, {'Content-Type' : 'text/css'});
    res.end(fs.readFileSync('html/scores.css'));
});

require('../lib/scoreswebpage')(router, db);

http.createServer(router).listen(conf.web.port);
