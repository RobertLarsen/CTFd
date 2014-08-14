$(function() {
    var Create = function(username, password, name, email, gender, callback) {
        $.ajax({
            url : 'auth.php',
            type : 'post',
            data : {
                action   : 'create',
                username : username,
                password : password,
                name     : name,
                email    : email,
                gender   : gender
            },
            success : function() {
                callback(true);
            },
            error : function(xhr) {
                callback(xhr.responseText);
            }
        });
    };

    var LookupUser = function() { };

    var Login = function(username, password, callback) {
        $.ajax({
            url : 'auth.php',
            type : 'post',
            data : {
                action   : 'login',
                username : username,
                password : password
            },
            success : function() {
                callback(true);
            },
            error : function(xhr) {
                callback(xhr.responseText);
            }
        });
    };

    var ChatAuthenticate = function(username, password) {
        var url = 'http://' + document.domain + ':7070/http-bind/',
            jid = username + '@ctf.dk',
            con = new Strophe.Connection(url);
        con.connect(jid, password, function(st) {
            switch (st) {
                case Strophe.Status.CONNECTED:
                    $(document).trigger('connected', con);
                break;
                case Strophe.Status.ERROR:
                    $(document).trigger('connection-error', con);
                break;
            }
        });
    };

    var AppendToText = function(html) {
        $('#text').append(html).animate({
            scrollTop : $('#text').prop('scrollHeight')
        }, 100);
    };

    var chatters = {};
    var chatterInfo = {};
    var pendingChats = [];

    $(document).bind('user-on', function(e, usr) {
        LookupUser(usr.name, function(info) {
            var html = '';

            if (info) {
                chatterInfo[usr.name] = info;
            } else {
                chatterInfo[usr.name] = {
                    created : new Date().getTime(),
                    gender : 0,
                    name : usr.name
                };
            }
            _.chain(chatters)
             .values()
             .sort(function(a, b) {
                return a.name.localeCompare(b.name);
             })
             .forEach(function(u) {
                 html += '<div id="chatter_' + u.id + '" class="gender_' + chatterInfo[u.name].gender + ' role_' + u.role + '">' + chatterInfo[u.name].name + '</div>';
             });

            AppendToText('<div class="user_event">' + chatterInfo[usr.name].name + ' joined</div>');

            $('#users').html(html);

            while (pendingChats.length > 0 && chatterInfo[pendingChats[0].name] !== undefined) {
                AddChatMessage(pendingChats.shift());
            }
        });
    });

    $(document).bind('user-off', function(e, usr) {
        $('#chatter_' + usr.id).remove();
        AppendToText('<div class="user_event">' + chatterInfo[usr.name].name + ' left</div>');
        delete chatterInfo[usr.name];
    });

    $(document).bind('user-connect', function(e, usr) {
        var i;
        if (chatters[usr.name] === undefined) {
            chatters[usr.name] = {
                id : -1,
                role : usr.role,
                name : usr.name,
                connections : []
            };

            for (i = 0; _.find(chatters, function(c) { return c.id === i; }); i++) { }

            chatters[usr.name].id = i;

            $(document).trigger('user-on', {
                id : chatters[usr.name].id,
                name : usr.name,
                role : usr.role
            });
        }
        chatters[usr.name].connections.push(usr);
    });

    $(document).bind('user-disconnect', function(e, usr) {
        if (chatters[usr.name] !== undefined) {
            var obj = _.find(chatters[usr.name].connections, function(e) { return usr.name === e.name && usr.jid === e.jid; });
            chatters[usr.name].connections = _.without(chatters[usr.name].connections, obj);
            if (chatters[usr.name].connections.length === 0) {
                $(document).trigger('user-off', {
                    id : chatters[usr.name].id,
                    name : usr.name,
                    role : usr.role
                });
                delete chatters[usr.name];
            }
        }
    });

    var AddChatMessage = function(msg) {
        AppendToText('<div class="chat_event"><div class="gender_' + chatterInfo[msg.name].gender + ' chatter">' + chatterInfo[msg.name].name + '</div>: ' + msg.text + '</div>');
    };

    $(document).bind('chat', function(e, msg) {
        if (chatterInfo[msg.name] === undefined) {
            pendingChats.push(msg);
        } else {
            AddChatMessage(msg);
        }
    });


    $(document).bind('connected', function(e, con) {
        var roomBareJid = 'jabba@conference.' + con.domain,
            directory = 'user.' + con.domain,
            currentId = 1;

        var OnUser = function(stanza) {
            var name = Strophe.getResourceFromJid(stanza.getAttribute('from')),
                x = stanza.firstChild,
                item = x.firstChild,
                role = item.getAttribute('role'),
                type = stanza.getAttribute('type'),
                jid = item.getAttribute('jid');

            if (type === 'unavailable') {
                $(document).trigger('user-disconnect', {
                    name : name,
                    role : role,
                    jid : jid
                });
            } else if (type === null) {
                $(document).trigger('user-connect', {
                    name : name,
                    role : role,
                    jid : jid
                });
            }
            return true;
        };

        LookupUser = function(name, callback) {
            var id = currentId++,
                successHandler,
                errorHandler,
                successFunction = function(stanza) {
                    con.deleteHandler(errorHandler);
                    var q = stanza.firstChild,
                        usr = {}, i, child;
                    for (i = 0; i < q.childNodes.length; i++) {
                        child = q.childNodes.item(i);
                        usr[child.nodeName] = child.firstChild.nodeValue;
                    }
                    usr['created'] = +usr['created']
                    usr['gender'] = +usr['gender']
                    callback(usr);
                },
                errorFunction = function() {
                    con.deleteHandler(successHandler);
                    callback(false);
                };

            con.addHandler(successFunction, null, 'iq', 'result', id);
            con.addHandler(errorFunction, null, 'iq', 'error', id);
                
            con.send($iq({
                    to : directory,
                    type : 'get',
                    id : id
                }).c('query', {
                    xmlns : 'jabba:directory:user',
                    user  : name
                }).c('name').up().c('created').up().c('gender')
           );
        };

        var OnChat = function(stanza) {
            var name = Strophe.getResourceFromJid(stanza.getAttribute('from')),
                text = stanza.firstChild.firstChild.nodeValue;

            $(document).trigger('chat', {
                name : name,
                text : text
            });
            return true;
        };

        con.addHandler(
            OnUser,
            'http://jabber.org/protocol/muc#user',
            'presence',
            null,
            null,
            roomBareJid,
            { matchBare : true }
        );

        con.addHandler(
            OnChat,
            'chat',
            'message',
            'groupchat',
            null,
            roomBareJid,
            { matchBare : true }
        );

        con.send($pres());
        con.send($pres({
                to : roomBareJid + '/' + Strophe.getNodeFromJid(con.jid)
            }).c('x', {
                xmlns : 'http://jabber.org/protocol/muc'
            })
        );

        $(window).unload(function() {
            con.disconnect();
        });

        $('#chat').show();
        $('input[type="text"]').focus();
        $('form').submit(function() {
            var txt = $('#chat_input').val();
            $('#chat_input').val('');
            con.send($msg({
                    to : roomBareJid,
                    type : 'groupchat',
                }).c('body', {xmlns:'chat'}).t(txt)
            );
            return false;
        });
    });

    $(document).bind('connection-error', function(e, con) {
        alert('Sorry, you could not connect at this time...try again later');
    });

    $('#login_dialog').dialog({
        title : 'Log in',
        buttons : [
            {
                text : "Login",
                click : function() {
                    var dialog = this,
                        username = $('#l_username').val(),
                        password = $('#l_password').val();
                    Login(username, password, function(result) {
                        if (result === true) {
                            $(dialog).dialog('close');
                            ChatAuthenticate(username, password);
                        } else {
                            alert(result);
                        }
                    });
                }
            },
            {
                text : "Create",
                click : function() {
                    $(this).dialog('close');
                    $("#create_dialog").dialog({
                        title : 'Create new user',
                        buttons : [
                            {
                                text : "Create",
                                click : function() {
                                    var dialog = this,
                                        username = $('#c_username').val(),
                                        pass1    = $('#c_password1').val(),
                                        pass2    = $('#c_password2').val(),
                                        real     = $('#c_name').val(),
                                        email    = $('#c_email').val(),
                                        gender   = $('input:radio[name=gender]:checked').val();
                                    if (pass1 !== pass2) {
                                        alert("The two passwords you entered differ!");
                                    } else {
                                        Create(username, pass1, real, email, gender, function(result) {
                                            if (result === true) {
                                                $(dialog).dialog('close');
                                                ChatAuthenticate(username, pass1);
                                            } else {
                                                alert(result);
                                            }
                                        });
                                    }
                                }
                            }
                        ]
                    });
                }
            }
        ]
    });
});
