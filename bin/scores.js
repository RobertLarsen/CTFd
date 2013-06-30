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


var StealsPerService = function() {
    this.data_ = {};
};

StealsPerService.prototype.name = function() {
    return 'steals_per_service';
};

StealsPerService.prototype.update = function(flag) {
    if (this.data_[flag.service] === undefined) {
        this.data_[flag.service] = 0;
    }
    this.data_[flag.service] += flag.captures.length;
};

StealsPerService.prototype.data = function() {
    var res = [],
        data = this.data_,
        counter = 0;
    _.chain(this.data_).keys().forEach(function(key) {
        res.push({
            label : key,
            data : [[res.length, data[key]]],
            bars : { show : true }
        });
    });
    return {
        options : {
            xaxis : {
                ticks : _.chain(res)
                         .map(function(d) {
                             return [
                                (counter++) + 0.5,
                                d.label
                             ];
                         }).value()
            },
            legend : {
                show : false
            }
        },
        data : res
    };
};

var TotalFlagSteals = function() {
    this.data_ = {};
};

TotalFlagSteals.prototype.name = function() {
    return 'TotalFlagSteals';
};

TotalFlagSteals.prototype.update = function(flag) {
    var newTeam = function() {
            return {
                stolen : 0,
                lost : 0
            };
        },
        data = this.data_;

    if (data[flag.team] === undefined) {
        data[flag.team] = newTeam();
    }

    data[flag.team].lost += flag.captures.length;
    _.forEach(flag.captures, function(capture) {
        if (data[capture.team] === undefined) {
            data[capture.team] = newTeam();
        }
        data[capture.team].stolen++;
    });
};

TotalFlagSteals.prototype.data = function() {
    return this.data_;
};

var StealsLossesPerTeam = function() {
    this.data_ = {};
};

StealsLossesPerTeam.prototype.name = function() {
    return "steals_losses_per_team";
};

StealsLossesPerTeam.prototype.update = function(flag) {
    var that = this;

    if (this.data_[flag.team] === undefined) {
        this.data_[flag.team] = {
            stolen : 0,
            lost : 0
        };
    }

    this.data_[flag.team].lost += flag.captures.length;

    _.forEach(flag.captures, function(capture) {
        if (that.data_[capture.team] === undefined) {
            that.data_[capture.team] = {
                stolen : 0,
                lost : 0
            };
        }
        that.data_[capture.team].stolen++;
    });
};

StealsLossesPerTeam.prototype.data = function() {
    var data = this.data_,
        teams = _.keys(data),
        res = [
            {
                label : 'Stolen',
                data : (function() {
                    var a = [], idx = 0;
                    _.forEach(teams, function(t) {
                        a.push([
                            idx, data[t].stolen
                        ]);
                        idx += 3;
                    });
                    return a;
                })(),
                bars : {
                    show : true
                }
            },
            {
                label : 'Lost',
                data : (function() {
                    var a = [], idx = 1;
                    _.forEach(teams, function(t) {
                        a.push([
                            idx, data[t].lost
                        ]);
                        idx += 3;
                    });
                    return a;
                })(),
                bars : {
                    show : true
                }
            }
        ],
        xaxis = {
            ticks : (function() {
                var a = [], idx = 1;
                _.forEach(teams, function(t) {
                    a.push([
                        idx, t
                    ]);
                    idx += 3;
                });
                return a;
            })()
        };

    return {
        options : {
            xaxis : xaxis,
        },
        data : res
    }
};

router.get('/scores.json', function(req, res) {
    var result = {},
        dataObjects = [
            new StealsLossesPerTeam(),
            new StealsPerService()
        ];


    res.writeHead(200, {'Content-Type' : 'application/json'});
    db.flags.find().forEach(function(err, doc) {
        if (err === null) {
            if (doc) {
                _.forEach(dataObjects, function(obj) {
                    obj.update(doc);
                });
            } else {
                _.forEach(dataObjects, function(obj) {
                    result[obj.name()] = obj.data();
                });
                res.end(JSON.stringify(result, null, 4));
            }
        }
    });
});

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

http.createServer(router).listen(conf.scores_port);
