var GetBare = function(jid) {
    return jid.split('/')[0];
};

var GetServer = function(jid) {
    var components = GetDomain(jid).split('.');
    return components.slice(components.length - 2).join('.');
};

var GetNode = function (jid) {
    var idx = jid.indexOf('@');
    return idx >= 0 ? jid.substring(0, idx) : null;
};

var GetDomain = function (jid) {
    var bare = GetBare(jid),
        idx = bare.indexOf('@');
    return idx >= 0 ? bare.substring(idx + 1) : bare;
};

var GetResource = function (jid) {
    var idx = jid.indexOf('/');
    return idx >= 0 ? jid.substring(idx + 1) : null;
};

module.exports = {
    GetServer : GetServer,
    GetBare : GetBare,
    GetNode : GetNode,
    GetDomain : GetDomain,
    GetResource : GetResource
};
