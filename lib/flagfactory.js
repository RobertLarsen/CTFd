var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    Flag = require('./flag');

module.exports = FlagFactory;

function FlagFactory(nameLength, flagLength) {
    EventEmitter.call(this);
    this.nameLength = nameLength;
    this.flagLength = flagLength;

    this.nameToFlag = {};
    this.flags = {};
};
util.inherits(FlagFactory, EventEmitter);

FlagFactory.prototype.createFlag = function(team, service, time) {
    var name = this._createUniqueRandomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', this.nameLength, this.nameToFlag),
        data = this._createUniqueRandomString('0123456789ABCDEF', this.flagLength, this.flags),
        flag = new Flag(name, data, team, service);

    this.nameToFlag[name] = flag;
    this.flags[data] = flag;

    this.emit('flag', flag, time);

    return flag;
};

FlagFactory.prototype._createUniqueRandomString = function(alphabet, length, hash) {
    var str;

    do {
        str = this._createRandomString(alphabet, length);
    } while (hash[str] !== undefined);

    return str;
}

FlagFactory.prototype._createRandomString = function(alphabet, length) {
    var str = '';
    while (str.length < length) {
        str += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return str;
};
