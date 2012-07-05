var EventEmitter = require('events').EventEmitter,
    util = require('util'),
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

ServiceCommandExecuter.prototype._templateCommand = function(template, flag) {
    return templatesubstitute(template, {
        'SERVICE_DIRECTORY' : flag.service.directory,
        'HOST' : flag.team.host,
        'SERVICE_NAME' : flag.service.name,
        'FLAGID' : flag.name,
        'FLAG' : flag.data
    });
};
