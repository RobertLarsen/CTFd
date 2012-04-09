var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    net = require('net'),
    fs = require('fs'),
    FlagReceiver = require('./flagreceiver'),
    FlagFactory = require('./flagfactory');

module.exports = {
    UserDataParser : require('./userdataparser'),
    templateSubstitute : require('./templatesubstitute'),
    FlagFactory : FlagFactory,
    FlagReceiver : FlagReceiver,
    CTFd : CTFd,
    createDaemon : createDaemon
};

function createDaemon (conf) {
    var i, manifest, ctfd = new CTFd();

    if (conf.port !== undefined) {
        ctfd.setPort(conf.port);
    }

    if (conf.start) {
        ctfd.start();
    }

    if (conf.teams) {
        for (i = 0; i < conf.teams.length; i++) {
            ctfd.addTeam(conf.teams[i]);
        }
    }

    if (conf.services) {
        for (i = 0; i < conf.services.length; i++) {
            manifest = JSON.parse(fs.readFileSync(conf.services[i].manifest, 'utf-8')),
            ctfd.addService({
                name : conf.services[i].name,
                service_directory : conf.services[i].manifest.replace(/^(.*)\/.*/, '$1'),
                commands : manifest.commands
            });
        }
    }

    return ctfd;
};

function CTFd () {
    EventEmitter.call(this);
    this.server_socket = null;
    this.port = null;
    this.flagReceiver = null;
    this.flagFactory = null;
    this.teams = {};
    this.services = {};
};
util.inherits(CTFd, EventEmitter);

CTFd.prototype.setPort = function(port) {
    this.port = port;
    this.emit('port', port);
    return this;
};

CTFd.prototype.addService = function(service) {
    if (this.services[service.name] === undefined) {
        this.services[service.name] = service;
        this.emit('service', service);
    }
    return this;
};

CTFd.prototype.addTeam = function(team) {
    if (this.teams[team.name] === undefined) {
        this.teams[team.name] = team;
        this.emit('team', team);
    }
    return this;
};

CTFd.prototype.start = function() {
    var that = this;

    this.flagFactory = new FlagFactory();
    this.emit('flag_factory', this.flagFactory);

    /* Create server socket */
    this.server_socket = net.createServer();
    this.emit('server_socket', this.server_socket);
    this.flagReceiver = new FlagReceiver(this.server_socket);
    this.emit('flag_receiver', this.flagReceiver);

    this.flagReceiver.on('connection', function(connection) {
        var teamName = null;
        connection.on('team', function(name) {
            if (teamName === null) {
                if (that.teams[name] === undefined) {
                    connection.socket.write('2: No such team\r\n');
                } else {
                    teamName = name;
                    connection.socket.write('0: Team name received\r\n');
                }
            } else {
                connection.socket.write('1: Team name already received\r\n');
            }
        });
    });

    this.server_socket.listen(this.port);

    return this;
};
