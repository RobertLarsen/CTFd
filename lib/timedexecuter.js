var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore'),
    child_process = require('child_process');

module.exports = TimedExecuter;

function TimedExecuter(max_time) {
    EventEmitter.call(this);
    this.max_time = max_time;
};
util.inherits(CTFd, EventEmitter);

TimedExecuter.ERROR_CODES = {
    'OK' : 0,
    'TIMED_OUT' : -1
};

TimedExecuter.prototype.execute = function(command, callback) {
    var child = child_process.exec(command, {
        timeout : this.max_time
    }, _.bind(function(err, stdout, stderr) {
        var data = {
            'command' : command,
            'status' : -1,
            'line' : 'Timed out'
        };
        if (err === null || err.killed === false) {
            data.status = err ? err.code : 0;
            data.line = stdout.split('\n')[0];
        }
        callback(data.status, data.line);
        this.emit('command', data);
    }, this));
}
