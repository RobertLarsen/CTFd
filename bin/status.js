var http = require('http'),
    fs = require('fs'),
    mongojs = require('mongojs'),
    router = require('choreographer').router(),
    conf = JSON.parse(
        fs.readFileSync(process.argv.length > 2 ? 
            process.argv[2] : 'config.js', 'utf-8')
    ),
    db = mongojs.connect(conf.database, ['flags']);

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

require('../lib/statuswebpage')(router, db);

http.createServer(router).listen(conf.web.port);
