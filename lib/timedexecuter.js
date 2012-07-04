var child_process = require('child_process');

module.exports = TimedExecuter;

function TimedExecuter(max_time) {
    this.max_time = max_time;
};

TimedExecuter.ERROR_CODES = {
    'OK' : 0,
    'TIMED_OUT' : -1
};

TimedExecuter.prototype.execute = function(command, callback) {
    var child = child_process.exec(command, {
        timeout : this.max_time
    }, function(err, stdout, stderr) {
        if (err && err.killed) {
            callback(TimedExecuter.ERROR_CODES.TIMED_OUT, 'Timed out');
        } else {
            callback(err ? err.code : 0, stdout.split('\n')[0]);
        }
    });
}
