var _ = require('underscore');

var getBareJidFromJid = function (jid) {
    return jid ? jid.split("/")[0] : null;
};

var Handler = function(callback, ns, name, type, id, from, to, options) {
    this.callback = callback;
    this.ns = ns;
    this.name = name;
    this.type = type;
    this.id = id;
    this.to = to;
    this.options = options || {matchBare : false};

    if (!this.options.matchBare) {
        this.options.matchBare = false;
    }

    if (this.options.matchBare) {
        this.from = from ? getBareJidFromJid(from) : null;
    } else {
        this.from = from;
    }
};

Handler.prototype.isMatch = function(elem) {
    var nsMatch = false,
        from = elem.attrs.from,
        that = this,
        answer = false;

    if (this.options.matchBare) {
        from = getBareJidFromJid(from);
    }

    if (this.ns) {
        _.each(elem.children, function (child) {
            if (child.attrs && child.attrs.xmlns && child.attrs.xmlns === that.ns) {
                nsMatch = true;
            }
        });
        nsMatch = nsMatch || elem.attrs.xmlns === this.ns;
    } else {
        nsMatch = true;
    }

    if (nsMatch &&
        (!this.name || elem.name === this.name) &&
        (!this.type || (elem.attrs.type && elem.attrs.type === this.type)) &&
        (!this.id   || (elem.attrs.id && elem.attrs.id === this.id)) &&
        (!this.to   || (elem.attrs.to && elem.attrs.to === this.to)) &&
        (!this.from || from === this.from)) {
        answer = true;
    }
    return answer;
};

var HandlerList = function(opt_unhandledHandlerList) {
    this.list = [];
    this.unhandledHandlerList = opt_unhandledHandlerList;
};

HandlerList.prototype.addHandler = function(callback, ns, name, type, id, from, to, options) {
    if (_.contains([null, 'iq','presence','message'], name) === false) {
        throw 'Unknown stanza name: ' + name;
    }
    var h = new Handler(callback, ns, name, type, id, from, to, options);
    this.list.push(h);
    return h;
};

HandlerList.prototype.deleteHandler = function(handler) {
    this.list = _.without(this.list, handler);
};

HandlerList.prototype.handle = function(stanza) {
    var matches = _.filter(this.list, function(elem) {
        return elem.isMatch(stanza);
    });

    _.each(matches, function(handler) {
        if (!handler.callback(stanza)) {
            this.list = _.without(this.list, handler);
        }
    }, this);

    if (matches.length === 0 && this.unhandledHandlerList) {
        this.unhandledHandlerList.handle(stanza);
    }

    return matches.length;
};

module.exports = HandlerList;
