var _ = require('underscore');

module.exports = function (router, db) {
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
    
    var StealsPerTeam = function() {
        this.data_ = {
            services : [],
            steals : {},
        };
    };
    
    StealsPerTeam.prototype.name = function() {
        return 'steals_per_team';
    };
    
    StealsPerTeam.prototype.update = function(flag) {
        var d = this.data_,
            createTeam = function() {
                var t = {};
                _.forEach(d.services, function(s) {
                    t[s] = 0;
                });
                return t;
            };
        if (d.services.indexOf(flag.service) === -1) {
            d.services.push(flag.service);
    
            _.forEach(d.steals, function(t) {
                t[flag.service] = 0;
            });
        }
    
        if (d.steals[flag.team] === undefined) {
            d.steals[flag.team] = createTeam();
        }
    
        _.forEach(flag.captures, function(c) {
            if (d.steals[c.team] === undefined) {
                d.steals[c.team] = createTeam();
            }
            d.steals[c.team][flag.service]++;
        });
    };
    
    StealsPerTeam.prototype.data = function() {
        var res = [],
            d = this.data_,
            serviceIndex = 0,
            serviceCount = d.services.length + 2;
        _.forEach(d.services, function(s) {
            var series = {
                label : s,
                bars : {
                    show : true
                },
                data : (function() {
                    var series = [],
                        i = 0;
                    _.chain(d.steals).keys().forEach(function(team) {
                        series.push([
                            (i++) * serviceCount + serviceIndex, d.steals[team][s]
                        ]);
                    });
                    return series;
                })()
            };
            res.push(series);
            serviceIndex++;
        });
    
        return {
            options : {
                xaxis : {
                    ticks : (function() {
                        var t = [], i = 0;
                        _.chain(d.steals).keys().forEach(function(team) {
                            t.push([
                                (i++) * serviceCount + ((serviceCount - 2) / 2),
                                team
                            ]);
                        });
                        return t;
                    })()
                }
            },
            data : res
        };
    };
    
    var LossesPerTeam = function() {
        this.data_ = {
            services : [],
            losses : {},
        };
    };
    
    LossesPerTeam.prototype.name = function() {
        return 'losses_per_team';
    };
    
    LossesPerTeam.prototype.update = function(flag) {
        var d = this.data_,
            createTeam = function() {
                var t = {};
                _.forEach(d.services, function(s) {
                    t[s] = 0;
                });
                return t;
            };
        if (d.services.indexOf(flag.service) === -1) {
            d.services.push(flag.service);
    
            _.forEach(d.losses, function(t) {
                t[flag.service] = 0;
            });
        }
    
        if (d.losses[flag.team] === undefined) {
            d.losses[flag.team] = createTeam();
        }
    
        _.forEach(flag.captures, function(c) {
            if (d.losses[c.team] === undefined) {
                d.losses[c.team] = createTeam();
            }
        });
    
        d.losses[flag.team][flag.service] += flag.captures.length;
    };
    
    LossesPerTeam.prototype.data = function() {
        var res = [],
            d = this.data_,
            serviceIndex = 0,
            serviceCount = d.services.length + 2;
        _.forEach(d.services, function(s) {
            var series = {
                label : s,
                bars : {
                    show : true
                },
                data : (function() {
                    var series = [],
                        i = 0;
                    _.chain(d.losses).keys().forEach(function(team) {
                        series.push([
                            (i++) * serviceCount + serviceIndex, d.losses[team][s]
                        ]);
                    });
                    return series;
                })()
            };
            res.push(series);
            serviceIndex++;
        });
    
        return {
            options : {
                xaxis : {
                    ticks : (function() {
                        var t = [], i = 0;
                        _.chain(d.losses).keys().forEach(function(team) {
                            t.push([
                                (i++) * serviceCount + ((serviceCount - 2) / 2),
                                team
                            ]);
                        });
                        return t;
                    })()
                }
            },
            data : res
        };
    };
    
    var CumulativeSteals = function() {
        this.highestTimestamp_ = Number.MIN_VALUE;
        this.lowestTimestamp_ = Number.MAX_VALUE;
        this.data_ = {
        };
    };
    
    CumulativeSteals.prototype.name = function() {
        return 'cumulative_steals';
    };
    
    CumulativeSteals.prototype.update = function(flag) {
        var d = this.data_,
            that = this;
        if (d[flag.team] === undefined) {
            d[flag.team] = [];
        }
        _.forEach(flag.captures, function(capture) {
            if (d[capture.team] === undefined) {
                d[capture.team] = [];
            }
            d[capture.team].push(capture.time);
           
            that.highestTimestamp_ = Math.max(that.highestTimestamp_, capture.time);
            that.lowestTimestamp_ = Math.min(that.lowestTimestamp_, capture.time);
        });
    };
    
    CumulativeSteals.prototype.data = function() {
        var res = [],
            d = this.data_,
            high = this.highestTimestamp_,
            low = this.lowestTimestamp_;
    
        _.chain(d).keys().forEach(function(team) {
            d[team].sort();
            res.push({
                label : team,
                data : (function() {
                    var a = [], sum = 0;
                    _.forEach(d[team], function(ts) {
                        a.push([
                            ts, ++sum
                        ]);
                    });
                    a = [[low, 0]].concat(a);
                    a.push([
                        high, a[a.length - 1][1]
                    ]);
                    return a;
                })()
            });
        });
        return {
            options : {
                legend : {
                    position : 'nw'
                },
                xaxis : {
                    mode : 'time'
                }
            },
            data : res
        };
    };
    
    router.get('/scores.json', function(req, res) {
        var result = {},
            dataObjects = [
                new CumulativeSteals(),
                new LossesPerTeam(),
                new StealsPerTeam(),
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
};
