setTimeout(function() {
    var xmpp = require('node-xmpp'),
        mongojs = require('mongojs'),
        _ = require('underscore'),
        fs = require('fs'),
        jabba = require('./index'),
        idIterator = new jabba.IdIterator(),
        conf = JSON.parse(
            fs.readFileSync(process.argv.length > 2 ? 
                process.argv[2] : 'config.json', 'utf-8')
        ),
        server_jid = _.rest(conf.jid.split('.'), 1).join('.'),
        handler = new jabba.HandlerList(), 
        db = mongojs.connect(conf.database, ['users']),
        comp = new xmpp.Component({
            jid       : conf.jid,
            password  : conf.password,
            host      : conf.server,
            port      : conf.port,
            reconnect : true
        }),
        errorIq = function(stanza) {
            var iq = new xmpp.Iq({
                    id : stanza.attrs.id,
                    to : stanza.attrs.from,
                    from : stanza.attrs.to,
                    type : 'error'
                }),
                addElem = function(dst, src) {
                    var e = dst.c(src.name, src.attrs);
                    _.each(src.children, function(child) {
                        addElem(e, child);
                    });
                };
            _.each(stanza.children, function(child) {
                addElem(iq, child);
            });
            return iq;
        };
    
    handler.addHandler(
        function(stanza) {
            var q;
            if (stanza.children.length > 0) {
                q = stanza.children[0];
                if (q.attrs.user !== undefined) {
                    db.users.findOne({_id:q.attrs.user}, function(err, doc) {
                        var iq = null;
                        if (doc === null) {
                            iq = errorIq(stanza).c('error', {
                                    code : 404,
                                    type : 'cancel'
                                }).c('item-not-found', {
                                    xmlns : 'urn:ietf:params:xml:ns:xmpp-stanzas'
                                });
                        } else {
                            iq = new xmpp.Iq({
                                    to : stanza.attrs.from,
                                    from : stanza.attrs.to,
                                    id : stanza.attrs.id,
                                    type : 'result'
                                }).c('query', {
                                    xmlns : 'jabba:directory:user',
                                    user : q.attrs.user
                                });
                            _.forEach(q.children, function(child) {
                                if (doc[child.name] !== undefined) {
                                    iq.c(child.name).t(doc[child.name]);
                                }
                            });
                        }
                        comp.send(iq);
                    });
                }
            }
            return true;
        },
        'jabba:directory:user',
        'iq',
        'get',
        null,
        null,
        conf.jid
    );
    
    handler.addHandler(
        function(stanza) {
            comp.send(new xmpp.Iq({
                    to : stanza.attrs.from,
                    from : stanza.attrs.to,
                    id : stanza.attrs.id,
                    type : 'result'
                }).c('query', {
                    xmlns : 'http://jabber.org/protocol/disco#info'
                }).c('feature', {
                    'var' : 'http://jabber.org/protocol/disco#info'
                }).up().c('feature', {
                    'var' : 'http://jabber.org/protocol/disco#items'
                }).up().c('feature', {
                    'var' : 'urn:xmpp:ping'
                }).up().c('feature', {
                    'var' : 'jabba:directory:user'
                }).up().c('identity', {
                    'type' : 'user',
                    'category' : 'directory',
                    'name' : 'User Directory'
                })
            );
            return true;
        },
        'http://jabber.org/protocol/disco#info',
        'iq',
        'get',
        null,
        null,
        conf.jid
    );
    
    handler.addHandler(
        function(stanza) {
            comp.send(new xmpp.Iq({
                    to : stanza.attrs.from,
                    from : stanza.attrs.to,
                    id : stanza.attrs.id,
                    type : 'result'
                }).c('query', {
                    xmlns : 'http://jabber.org/protocol/disco#items'
                })
            );
            return true;
        },
        'http://jabber.org/protocol/disco#items',
        'iq',
        'get',
        null,
        null,
        conf.jid
    );
    
    comp.on('stanza', function(stanza) {
        handler.handle(stanza);
    });
    
    comp.on('online', function() {
        setInterval(function() {
            comp.send(
                new xmpp.Iq({
                    to : server_jid,
                    from : conf.jid,
                    type : 'get',
                    id : idIterator.next()
                }).c('ping', {
                    xmlns : 'urn:xmpp:ping'
                })
            );
        }, conf.ping_interval);
    });
    
    comp.on('error', function() {
    });
}, 10000);
