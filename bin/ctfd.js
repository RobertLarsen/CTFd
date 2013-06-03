var repl = require('repl'),
    ctfd = require('../index');
    daemon = ctfd.createDaemon({
        port : 6600,
        database : 'ctfd',
        start : true,
        teams : [
            {
                name : 'Team 1',
                host : '192.168.0.1'
            },
            {
                name : 'Team 2',
                host : '192.168.0.2'
            }
        ],
        services : [
            {
                name : 'Service 1',
                manifest : '/home/robert/code/ctfd/services/SomeService/Manifest.json'
            },
            {
                name : 'Service 2',
                manifest : '/home/robert/code/ctfd/services/SomeService/Manifest.json'
            }
        ]
    });

repl.start('ctfd> ').context.daemon = daemon;
