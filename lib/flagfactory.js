var EventEmitter = require('events').EventEmitter,
    util = require('util');

module.exports = FlagFactory;

function FlagFactory(nameLength, flagLength) {
    EventEmitter.call(this);
    this.nameLength = nameLength;
    this.flagLength = flagLength;

    this.nameToFlag = {};
    this.flags = {};
};
util.inherits(FlagFactory, EventEmitter);

FlagFactory.prototype.createFlag = function() {
    var data = {
        'name' : this._createUniqueRandomString('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', this.nameLength, this.nameToFlag),
        'flag' : this._createUniqueRandomString('0123456789ABCDEF', this.flagLength, this.flags)
    };

    this.nameToFlag[data.name] = data;
    this.flags[data.flag] = data;

    this.emit('flag', data);

    return data;
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
