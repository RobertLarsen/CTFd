var xmpp = require('node-bosh-xmpp-client'),
    HandlerList = require('./handlerlist'),
    GenerateName = require('./names'),
    _ = require('underscore'),
    http = require('http'),
    url = require('url'),
    qs = require('querystring'),
    $iq = xmpp.$iq,
    $msg = xmpp.$msg,
    $pres = xmpp.$pres;

var SERVER_JID = 'ctf.dk';
var ROOM_NAME = 'jabba';

var WebSite = function(auth_url) {
    this.auth_url = auth_url;
};

WebSite.prototype.create = function(name, password, real_name, email, gender, callback) {
    var u = url.parse(this.auth_url),
        req = http.request({
        hostname : u.host,
        path : u.pathname,
        method : 'POST'
    }, function(res) {
        callback(res.statusCode === 200);
    });

    req.on('error', function() {
        callback(false);
    });

    req.setHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    req.setHeader('Connection', 'close');

    req.end(qs.stringify({
        action : 'create',
        username : name,
        password : password,
        name : real_name,
        email : email,
        gender : gender
    }), 'utf-8');
};

WebSite.prototype.login = function(name, password, callback) {
    var u = url.parse(this.auth_url),
        req = http.request({
        hostname : u.host,
        path : u.pathname,
        method : 'POST'
    }, function(res) {
        callback(res.statusCode === 200);
    });

    req.on('error', function() {
        callback(false);
    });

    req.setHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    req.setHeader('Connection', 'close');

    req.end(qs.stringify({
        action : 'login',
        username : name,
        password : password
    }), 'utf-8');
};

var Room = function(room_jid, my_jid, chatters, connection) {
    this.jid = room_jid;
    this.my_jid = my_jid;
    this.chatters = chatters;
    this.connection = connection;
};

Room.prototype.leave = function() {
    this.connection.client.send($pres({
            to : this.my_jid,
            type : 'unavailable'
        })
    );
};

Room.prototype.chat = function(text, callback) {
    this.connection.client.send($msg({
            to : this.jid,
            type : 'groupchat'
        }).c('body', {xmlns:'chat'}).t(text)
    );
    this.connection.handlers.addHandler(
        function(stanza) {
            if (stanza.children[0].children[0] === text) {
                callback(true);
            }
            return true;
        },
        'chat',
        'message',
        'groupchat',
        null,
        this.my_jid
    );
};

var Connection = function(jabber, client) {
    var h = new HandlerList();
    this.jabber = jabber;
    this.client = client;
    this.handlers = h;
    client.on('stanza', function(s) {
        h.handle(s);
    });
};

Connection.prototype.join = function(room, nick, callback) {
    var jid = room + '@conference.' + this.jabber.server_jid,
        my_jid = jid + '/' + nick,
        chatters = [],
        that = this,
        GetResource = function (jid) {
            var idx = jid.indexOf('/');
            return idx >= 0 ? jid.substring(idx + 1) : null;
        };

    this.client.send($pres({
            to : my_jid,
        }).c('x', {
            xmlns : 'http://jabber.org/protocol/muc'
        })
    );

    this.handlers.addHandler(
        function(s) {
            var res = true,
                name = GetResource(s.attrs.from);
            chatters.push(name);
            if (name === nick) {
                callback(new Room(jid, my_jid, chatters, that));
                res = false;
            }
            return res;
        },
        null,
        'presence',
        null,
        null,
        jid,
        null,
        {matchBare:true}
    );
};

Connection.prototype.close = function() {
    this.client.disconnect();
};

var Jabber = function(bosh_url, server_jid) {
    this.bosh_url = bosh_url;
    this.server_jid = server_jid;
};

Jabber.prototype.login = function(name, password, callback) {
    var jid = name + '@' + this.server_jid + '/' + Math.round(Math.random() * 10000000000000),
        client = new xmpp.Client(jid, password, this.bosh_url),
        that = this;

    client.on('error', function() {
        callback(false);
    });

    client.on('online', function() {
        client.send($pres());
        callback(new Connection(that, client));
    });
};

var UserInfoRetriever = function(jid, connection) {
    this.jid = jid;
    this.connection = connection;
};

UserInfoRetriever.prototype.lookup = function(names, callback) {
    var info = {},
        jid = this.jid,
        c = this.connection,
        nextId = 1000,
        CheckNext = function() {
            var name = names.shift();
            if (name === undefined) {
                callback(info);
            } else {
                var id = nextId++,
                    successHandler, errorHandler,
                    successFunction = function(s) {
                        var q = s.children[0],
                            userinfo = {};
                        _.forEach(q.children, function(e) {
                            userinfo[e.name] = e.children[0];
                        });
                        userinfo.gender = +userinfo.gender;
                        userinfo.created = +userinfo.created;
                        info[name] = userinfo;
                        c.handlers.deleteHandler(errorHandler);
                        CheckNext();
                    },
                    errorFunction = function(s) {
                        c.handlers.deleteHandler(successHandler);
                        callback(false);
                    };
                successHandler = c.handlers.addHandler(
                    successFunction,
                    null,
                    'iq',
                    'result',
                    '' + id
                );
                errorHandler = c.handlers.addHandler(
                    errorFunction,
                    null,
                    'iq',
                    'error',
                    '' + id
                );
                c.client.send($iq({
                        to : jid,
                        type : 'get',
                        id : id
                    }).c('query', {
                        xmlns : 'jabba:directory:user',
                        user : name
                    }).c('name').up().c('created').up().c('gender').up().c('email')
                );
            }
        };
    CheckNext();
};

var SayInRoom = function(bosh, server_jid, username, password, room, text, callback) {
    var j = new Jabber(bosh, server_jid);
    j.login(username, password, function(con) {
        if (con === false) {
            callback(false, 'Could not connect to Jabber');
        } else {
            con.join(room, username, function(room) {
                var userInfo = {},
                    retriever = new UserInfoRetriever('user.' + server_jid, con);

                retriever.lookup(room.chatters, function(userinfo) {
                    if (userinfo === false) {
                        callback(false, 'Could not lookup user information');
                    } else {
                        setTimeout(function() {
                            room.chat(text, function(res) {});
                            setTimeout(function() {
                                room.leave();
                                setTimeout(function() {
                                    callback(true);
                                }, 100);
                            }, 1000);
                        }, 2000);
                    }
                });
            });
        }
    });
};


var Usage = function() {
    console.log('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' --check <username> <password> <bosh_url> <auth_url>');
    console.log('       ' + process.argv[0] + ' ' + process.argv[1] + ' --plant <username> <password> <bosh_url> <auth_url>');
}

var Check = function(username, password, bosh, auth, callback) {
    var ws = new WebSite(auth);

    ws.login(username, password, function(res) {
        if (res === false) {
            callback(false, 'Could not login to website');
        } else {
            SayInRoom(bosh, SERVER_JID, username, password, ROOM_NAME, 'Hello CTF World!', callback);
        }
    });
};

var Create = function(username, password, name, email, gender, bosh, auth, callback) {
    var ws = new WebSite(auth);
    ws.create(username, password, name, email, gender, function(res) {
        if (res === false) {
            callback(false, 'Could not create user');
        } else {
            callback(true, 'Yay');
        }
    });
};

var IndicateSuccess = function(res, txt) {
    if (!res) {
        console.log(txt);
    }
    process.exit(res ? 0 : 1);
};

if (process.argv.length < 3) {
    Usage();
} else {
    if (process.argv[2] === '--check' && process.argv.length === 7) {
        var username = process.argv[3],
            password = process.argv[4],
            bosh_url = process.argv[5],
            auth_url = process.argv[6];
        Check(username, password, bosh_url, auth_url, IndicateSuccess);
    } else if (process.argv[2] === '--plant' && process.argv.length === 7) {
        var username = process.argv[3],
            password = process.argv[4],
            bosh_url = process.argv[5],
            auth_url = process.argv[6]
            gender   = Math.random() > 0.5 ? 'male' : 'female',
            name     = GenerateName(gender),
            email    = username + '@prosactf.dk';
        Create(username, password, name, email, gender, bosh_url, auth_url, IndicateSuccess);
    } else {
        Usage();
    }
}

//SayInRoom('http://192.168.2.148:7070/http-bind/', 'komogvind.dk', 'robert', 'blar', 'jabba', 'Hello y\'all ' + Math.round(Math.random() * 1000000000), function(res) {
//    process.exit(res ? 0 : 1);
//});
