var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    templateSubstitute = require('./templatesubstitute'),
    _ = require('underscore');

module.exports = ServiceCommandExecuter;

function ServiceCommandExecuter(executer) {
    EventEmitter.call(this);
    this.executer = executer;
};
util.inherits(ServiceCommandExecuter, EventEmitter);

ServiceCommandExecuter.prototype.plantFlag = function(flag, callback) {
    var cmd = this._templateCommand(flag.service.commands.plant_flag, flag);
    this._execute(cmd, flag, callback, 'plant');
};

ServiceCommandExecuter.prototype.checkFlag = function(flag, callback) {
    var cmd = this._templateCommand(flag.service.commands.check_flag, flag);
    this._execute(cmd, flag, callback, 'check');
};

ServiceCommandExecuter.prototype._execute = function(cmd, flag, callback, event) {
    this.executer.execute(cmd, _.bind(function(status, line) {
        this.emit(event, {
            'flag' : flag,
            'result' : {
                'status' : status,
                'line' : line
            }
        });
        callback(status, line);
    }, this));
}

var escapeshell = function(str) {
    return "'" + str + "'";
};

ServiceCommandExecuter.prototype._templateCommand = function(template, flag) {
    return templateSubstitute(template, {
        'SERVICE_DIRECTORY' : escapeshell(flag.service.directory),
        'HOST' : escapeshell(flag.team.host),
        'SERVICE_NAME' : escapeshell(flag.service.name),
        'FLAGID' : escapeshell(flag.name),
        'FLAG' : escapeshell(flag.data)
    });
};
