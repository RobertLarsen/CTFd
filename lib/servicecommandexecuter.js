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

ServiceCommandExecuter.prototype._modify = function(data) {
    var hex = '0123456789ABCDEF',
        idx = Math.floor(Math.random() * data.length),
        chr = hex.charAt(Math.floor(Math.random() * hex.length));
    return data.substring(0, idx) + chr + data.substring(idx + 1);
};

ServiceCommandExecuter.prototype._falsePositiveCheckFlag = function(flag) {
    bad_flag = JSON.parse(JSON.stringify(flag));
    while (flag.data === bad_flag.data) {
        bad_flag.data = this._modify(flag.data);
    }

    return {
        cmd : this._templateCommand(flag.service.commands.check_flag, bad_flag),
        modifier : function(status, line) {
            return [
                status === 0 ? 1 : 0,
                status === 0 ? 'False positive detected : ' + line : null
            ];
        }
    };
};

ServiceCommandExecuter.prototype.checkFlag = function(flag, callback) {
    //One good check and four false positive checks
    var cmds = [
        {
            cmd : this._templateCommand(flag.service.commands.check_flag, flag),
            modifier : function(status, line) { return [status, line]; }
        },
        this._falsePositiveCheckFlag(flag),
        this._falsePositiveCheckFlag(flag),
        this._falsePositiveCheckFlag(flag),
        this._falsePositiveCheckFlag(flag)
    ], combined_status = 0, combined_line = null, count = 0, that = this;
    //Randomize their order
    cmds.sort(function() { return Math.floor(Math.random() * 3) - 1; });
    _.forEach(cmds, function(cmd) {
        that._execute(cmd.cmd, flag, function(status, line) {
            var modified = cmd.modifier(status, line);
            status = modified[0];
            line = modified[1];
            if (combined_line === null) {
                combined_line = line;
            }
            if (status !== 0) {
                combined_status = status;
                combined_line = line;
            }
            count++;
            if (count === cmds.length) {
                callback(combined_status, combined_line);
            }
        }, 'check');
    });
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
