var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    _ = require('underscore');

module.exports = UserDataParser;

function UserDataParser() {
    EventEmitter.call(this);

    var legalCommands = [
        'TEAM', 'FLAG'
    ];
    this.data = '';

    this.on('line', function(line) {
        var regex = /^(.*) (.*)$/,
            match = regex.exec(line);
        if (match && _.indexOf(legalCommands, match[1]) !== -1) {
            this.emit(match[1], match[2]);
        } else {
            this.emit('malformed', line);
        }
    });
};
util.inherits(UserDataParser, EventEmitter);

UserDataParser.prototype.append = function(data) {
    this.data = this._parse(this.data + data);
    return this.data;
};

UserDataParser.prototype._parse = function(data) {
    var str;
    while (data.match(/\n/)) {
        str = data.replace(/([^\r\n]*?)[\r\n]+/, '$1');
        data = data.replace(/[^\r\n]*?[\r\n]+(.*)/, '$1');
        this.emit('line', str);
    }
    return data;
};

