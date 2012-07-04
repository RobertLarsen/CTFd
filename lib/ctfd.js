var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    net = require('net'),
    fs = require('fs'),
    templatesubstitute = require('./templatesubstitute'),
    FlagReceiver = require('./flagreceiver'),
    FlagFactory = require('./flagfactory'),
    TimedExecuter = require('./timedexecuter'),
    Service = require('./service'),
    Team = require('./team');

module.exports = {
    UserDataParser : require('./userdataparser'),
    templateSubstitute : require('./templatesubstitute'),
    FlagFactory : FlagFactory,
    FlagReceiver : FlagReceiver,
    TimedExecuter : TimedExecuter,
    CTFd : CTFd,
    createDaemon : createDaemon
};

function createDaemon (conf) {
    var i, manifest, ctfd = new CTFd();

    if (conf.port !== undefined) {
        ctfd.setPort(conf.port);
    }

    if (conf.max_execution_time) {
        ctfd.setExecutionTime(conf.max_execution_time);
    }

    if (conf.start) {
        ctfd.start();
    }

    if (conf.teams) {
        for (i = 0; i < conf.teams.length; i++) {
            ctfd.addTeam(new Team(conf.teams[i].name, conf.teams[i].host));
        }
    }

    if (conf.services) {
        for (i = 0; i < conf.services.length; i++) {
            manifest = JSON.parse(fs.readFileSync(conf.services[i].manifest, 'utf-8')),
            ctfd.addService(new Service(conf.services[i].name,
                                        conf.services[i].manifest.replace(/^(.*)\/.*/, '$1'),
                                        manifest.commands
                            ));
        }
    }

    return ctfd;
};

function CTFd () {
    EventEmitter.call(this);
    this.server_socket = null;
    this.port = null;
    this.flagReceiver = null;
    this.flagFactory = new FlagFactory(15, 64);
    this.teams = {};
    this.services = {};
    this.timedExecuter = new TimedExecuter(10000);
};
util.inherits(CTFd, EventEmitter);

CTFd.prototype.setExecutionTime = function(time) {
    this.timedExecuter.max_time = time;
};

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

CTFd.prototype._plantFlag = function(flag) {
    return this._templateCommand(flag.service.commands.plant_flag, flag);
};

CTFd.prototype._checkFlag = function(flag) {
    return this._templateCommand(flag.service.commands.check_flag, flag);
};

CTFd.prototype._templateCommand = function(template, flag) {
    return templatesubstitute(template, {
        'SERVICE_DIRECTORY' : flag.service.directory,
        'HOST' : flag.team.host,
        'SERVICE_NAME' : flag.service.name,
        'FLAGID' : flag.name,
        'FLAG' : flag.data
    });
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
        connection.on('flag', function(flag) {
            console.log('Flag: ' + flag);
        });
    });

    this.server_socket.listen(this.port);

    return this;
};
