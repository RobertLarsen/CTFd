var repl = require('repl'),
    ctfd = require('CTFd');
    daemon = ctfd.createDaemon({
        port : 6600,
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
                manifest : '/home/robert/code/CTF2/services/Phasebook/Manifest.json'
            }
        ]
    });

repl.start('ctfd> ').context.daemon = daemon;
