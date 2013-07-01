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

_.forEach(fs.readdirSync(conf.web.document_root), function(file) {
    var ext = file.substr(file.lastIndexOf('.') + 1);
    router.get('/' + file, function(req, res) {
        res.writeHead(200, {
            'Content-Type' : {
                'js' : 'application/javascript',
                'css' : 'text/css',
                'html' : 'text/html'
            }[ext]
        });
        res.end(fs.readFileSync(conf.web.document_root + '/' + file));
    });
});

require('../lib/scoreswebpage')(router, db);

http.createServer(router).listen(conf.web.port);
