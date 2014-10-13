var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore'),
    net = require('net'),
    fs = require('fs'),
    templatesubstitute = require('./templatesubstitute'),
    FlagReceiver = require('./flagreceiver'),
    FlagFactory = require('./flagfactory'),
    Flag = require('./flag'),
    TimedExecuter = require('./timedexecuter'),
    ServiceCommandExecuter = require('./servicecommandexecuter'),
    Service = require('./service'),
    Team = require('./team'),
    mongojs = require('mongojs'),
    http = require('http'),
    choreographer = require('choreographer');

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
    var i, manifest, ctfd = new CTFd(), router;

    if (conf.database !== undefined) {
        ctfd.setDatabase(mongojs.connect(conf.database, ['flags','challenges']));
    }

    if (conf.execution_log_file) {
        ctfd.setExecutionLogFile(conf.execution_log_file);
    }

    if (conf.port !== undefined) {
        ctfd.setPort(conf.port);
    }

    if (conf.max_execution_time) {
        ctfd.setExecutionTime(conf.max_execution_time);
    }

    if (conf.check_interval) {
        ctfd.setCheckIntervalTime(conf.check_interval);
    }

    if (conf.plant_interval) {
        ctfd.setPlantIntervalTime(conf.plant_interval);
    }

    if (conf.teams) {
        for (i = 0; i < conf.teams.length; i++) {
            ctfd.addTeam(conf.teams[i].name, conf.teams[i].host);
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

    if (conf.web) {
        router = choreographer.router();
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
        ctfd.setWebRouter(router, conf.web.port);
    }

    if (conf.points) {
        ctfd.setPoints(conf.points);
    }

    if (conf.start) {
        ctfd.start();
    }

    return ctfd;
};

function CTFd () {
    EventEmitter.call(this);
    this.server_socket = null;
    this.port = null;
    this.flagReceiver = null;
    this.db = null;
    this.flagFactory = null;
    this.plantInterval = null;
    this.checkInterval = null;
    this.plantIntervalTime = 1000 * 60 * 10;//Plant every 10 minutes
    this.checkInterval = null;
    this.checkIntervalTime = 1000 * 60 * 3;//Check every 3 minutes
    this.teams = {};
    this.services = {};
    this.timedExecuter = new TimedExecuter(10000);
    this.executionLogFile = null;
    this.executer = new ServiceCommandExecuter(this.timedExecuter);
    this.webRouter = null;
    this.latestPlantTime = null;
    this.points = {
        deliver : 1,
        capture : 1,
        defend : 1,
        check : 1
    }
};
util.inherits(CTFd, EventEmitter);

CTFd.prototype.setPoints = function(points) {
    if (points.deliver) this.points.deliver = points.deliver;
    if (points.capture) this.points.capture = points.capture;
    if (points.defend)  this.points.defend  = points.defend;
    if (points.check)   this.points.check   = points.check;
};

CTFd.prototype.setWebRouter = function(router, port) {
    this.webRouter = router;
    this.webPort = port;
    this.emit('webRouter', router, port);
};

CTFd.prototype.setPlantIntervalTime = function(time) {
    this.plantIntervalTime = time;
};

CTFd.prototype.setCheckIntervalTime = function(time) {
    this.checkIntervalTime = time;
};

CTFd.prototype.setDatabase = function(db) {
    this.db = db;
    this.emit('database', db);
};

CTFd.prototype.setExecutionLogFile = function(path) {
    var logFile = this.executionLogFile = fs.createWriteStream(path, {flags:'a',encoding:'utf8'});
    logFile.on('error', function() { console.log(arguments); });
    this.timedExecuter.on('command', function(data) {
        logFile.write(new Date() + ' - ' + data.command + ' - Status ' + data.status + ' - ' + data.line + "\n");
    });
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
    if (arguments.length === 3) {
        this.addService(new Service(
            arguments[0], arguments[1], arguments[2]
        ));
    } else {
        if (this.services[service.name] === undefined) {
            this.services[service.name] = service;
            this.emit('service', service);
        }
    }
    return this;
};

CTFd.prototype.addTeam = function(team) {
    if (arguments.length === 2) {
        this.addTeam(new Team(arguments[0], arguments[1]));
    } else {
        if (this.teams[team.name] === undefined) {
            this.teams[team.name] = team;
            this.emit('team', team);
        }
    }
    return this;
};

CTFd.prototype.start = function() {
    var that = this,
        db = this.db;

    db.flags.ensureIndex({'name':1}, function() {
        db.flags.find().count(function(err, count) {
            console.log('Found ' + count + ' flags in database');
            that.emit('restored');
        });
    });

    this.on('restored', _.bind(this.onRestore_, this));
    this.on('flag_factory', function(factory) {
        factory.on('flag', _.bind(that.onFlag_, that));
    });
    this.on('ready', function() {
        that.plantInterval = setInterval(_.bind(that.plantFlags_, that), that.plantIntervalTime);
        that.checkInterval = setInterval(_.bind(that.checkFlags_, that), that.checkIntervalTime);
        that.plantFlags_();
    });

    this.on('plant', function(flag, status, line) {
        db.flags.update(
            { _id : flag.data },
            { $set : { delivered : status === 0 } },
            function(err) {
                if (err) {
                    console.log(err);
                }
            }
        );
    });
    this.on('check', function(flag, time, status, line) {
        setTimeout(function() {
            var check = {
                time : time.getTime(),
                result : status === 0
            };
            db.flags.update(
                { _id : flag.data },
                { $push : { checks : check } },
                function(err) {
                    if (err) {
                        console.log(err);
                    }
                }
            );
        }, 500);
    });

    if (this.webRouter) {
        require('./scoreswebpage')(this.webRouter, this.db, this.points);
        require('./statuswebpage')(this.webRouter, this.db, this);
        require('./datavizwebpage')(this.webRouter, this.db, _.pluck(this.teams, 'name'), _.pluck(this.services, 'name'))
        http.createServer(this.webRouter).listen(this.webPort);
    }
};

CTFd.prototype.stopFlags = function() {
    if (this.plantInterval) {
        clearInterval(this.plantInterval);
    }
    if (this.checkInterval) {
        clearInterval(this.checkInterval);
    }
};

CTFd.prototype.checkFlags_ = function() {
    var that = this,
        time = new Date();

    if (+this.latestPlantTime < (+time) - this.timedExecuter.max_time) {
        //The plant command now has either succeeded or failed.
        this.db.flags.find({time:this.latestPlantTime, captures:{$size : 0}}).forEach(function(err, flag_doc) {
            var team, service, flag;
            if (err === null && flag_doc) {
                team = that.teams[flag_doc.team];
                service = that.services[flag_doc.service];
                flag = new Flag(flag_doc.name, flag_doc._id, team, service);
                that.executer.checkFlag(flag, function(status, line) {
                    that.emit('check', flag, time, status, line);
                });
            }
        });
    }
};

CTFd.prototype.plantFlags_ = function() {
    var that = this,
        time = new Date();
    this.latestPlantTime = time.getTime();
    _.each(this.services, function(service) {
        _.each(that.teams, function(team) {
            var flag = that.flagFactory.createFlag(team, service, time);
            that.executer.plantFlag(flag, function(status, line) {
                that.emit('plant', flag, status, line);
            });
        });
    });
};

CTFd.prototype.onFlag_ = function(flag, time) {
    //Then save new flag
    this.db.flags.save({
        _id : flag.data,
        name : flag.name,
        team : flag.team.name,
        service : flag.service.name,
        captures : [],
        checks : [],
        delivered : false,
        time : time.getTime()
    });
};

CTFd.prototype.onRestore_ = function() {
    var that = this;

    this.flagFactory = new FlagFactory(15, 64);
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
                        } else if (_.find(flag.captures, function(c) { return c.team === team.name; })) {
                            connection.socket.write('8: Flag already captured\r\n');
                        } else if (flag.time !== that.latestPlantTime) {
                            connection.socket.write('7: Flag no longer active\r\n');
                        } else {
                            that.db.flags.update(
                                { _id : id },
                                { $push : { captures : { team : team.name, time : new Date().getTime() } } },
                                function() {
                                    connection.socket.write('0: Flag captured\r\n');
                                    var service = that.services[flag.service],
                                        owner = that.teams[flag.team],
                                        f = new Flag(flag.name, flag._id, owner, service);

                                    that.emit('capture', f, team);
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
