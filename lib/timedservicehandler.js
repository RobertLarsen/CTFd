var _ = require('underscore');

module.exports = TimedServiceHandler;

function TimedServiceHandler(flagFactory, serviceCommandExecuter, service, teams) {
    this.flagFactory = flagFactory;
    this.serviceCommandExecuter = serviceCommandExecuter;
    this.service = service;
    this.teams = teams;

    _.each(teams, function(team) {
        team.flags[service.name] = [];
    });
};

TimedServiceHandler.prototype.plantFlags = function() {
    _.each(this.teams, _.bind(function(team) {
        var flag = this.flagFactory.createFlag(team, this.service);
        team.flags[this.service.name].push(flag);
        this.serviceCommandExecuter.plantFlag(flag, _.bind(function(status, line) {
            //Handle this
        }, this));
    }, this));
};

TimedServiceHandler.prototype.checkFlags = function() {
    _.each(this.teams, _.bind(function(team) {
        var flag = _.last(team.flags[this.service.name]);
        this.serviceCommandExecuter.checkFlag(flag, _.bind(function(status, line) {
            //Handle this
        }, this));
    }, this));
};
