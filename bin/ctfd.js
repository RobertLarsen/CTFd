console.log("Starting up")

var repl = require('repl'),
    ctfd = require('../index');
fs = require('fs'),
    conf = JSON.parse(
        fs.readFileSync(process.argv.length > 2 ? 
            process.argv[2] : 'config.js', 'utf-8')
    ),
    daemon = ctfd.createDaemon(conf);

repl.start('ctfd> ').context.daemon = daemon;
