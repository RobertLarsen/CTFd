var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore'),
    net = require('net'),
    fs = require('fs'),
    templatesubstitute = require('./templatesubstitute'),
    FlagReceiver = require('./flagreceiver'),
    FlagFactory = require('./flagfactory'),
    TimedExecuter = require('./timedexecuter'),
    ServiceCommandExecuter = require('./servicecommandexecuter'),
    Service = require('./service'),
    Team = require('./team'),
    mongojs = require('mongojs');

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

    if (conf.database !== undefined) {
        ctfd.setDatabase(mongojs.connect(conf.database, ['flags']));
    }

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
    this.db = null;
    this.flagFactory = new FlagFactory(15, 64);
    this.teams = {};
    this.services = {};
    this.timedExecuter = new TimedExecuter(10000);
    this.executer = new ServiceCommandExecuter(this.timedExecuter);
};
util.inherits(CTFd, EventEmitter);

CTFd.prototype.setDatabase = function(db) {
    this.db = db;
    this.emit('database', db);
};

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

CTFd.prototype.start = function() {
    var that = this,
        db = this.db;

    db.ensureIndex('flags', 'name', function() {
        db.flags.find().count(function(err, count) {
            console.log('Found ' + count + ' flags in database');
            that.emit('restored');
        });
    });

    this.on('restored', _.bind(this.onRestore_, this));
    this.on('flag_factory', function(factory) {
        factory.on('flag', _.bind(that.onFlag_, that));
    });

    return this;
};

CTFd.prototype.onFlag_ = function(flag) {
    this.db.save({
        _id : flag.data,
        name : flag.name,
        team : flag.team.name,
        service : flag.service.name,
        captures : [],
        checks : [],
        delivered : false,
        active : true,
        time : new Date().getTime()
    });
};

CTFd.prototype.onRestore_ = function() {
    var that = this;

    this.flagFactory = new FlagFactory();
    this.emit('flag_factory', this.flagFactory);

    /* Create server socket */
    this.server_socket = net.createServer();
    this.emit('server_socket', this.server_socket);
    this.flagReceiver = new FlagReceiver(this.server_socket);
    this.emit('flag_receiver', this.flagReceiver);

    this.flagReceiver.on('connection', function(connection) {
        var team = null;
        connection.on('team', function(name) {
            if (team === null) {
                if (that.teams[name] === undefined) {
                    connection.socket.write('2: No such team\r\n');
                } else {
                    team = that.teams[name];
                    connection.socket.write('0: Team name received\r\n');
                }
            } else {
                connection.socket.write('1: Team name already received\r\n');
            }
        });
        connection.on('flag', function(id) {
            if (team === null) {
                connection.socket.write('3: Team name missing\r\n');
            } else {
                that.db.flags.findOne({
                    _id : id
                }, function(err, flag) {
                    if (flag) {
                        if (flag.team === team.name) {
                            connection.socket.write('9: This is your own flag\r\n');
                        } else if (flag.captures.indexOf(team.name) >= 0) {
                            connection.socket.write('8: Flag already captured\r\n');
                        } else if (flag.active === false) {
                            connection.socket.write('7: Flag no longer active\r\n');
                        } else {
                            that.db.flags.update(
                                { _id : id },
                                { $push : { captures : team.name } },
                                function() {
                                    connection.socket.write('0: Flag captured\r\n');
                                }
                            );
                        }
                    } else {
                        connection.socket.write('6: No such flag\r\n');
                    }
                });
            }
        });
    });

    this.server_socket.listen(this.port);
    this.emit('ready');
};
