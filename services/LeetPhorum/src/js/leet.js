$(function() {
    var chosen = {
        post : null, 
        node : null
    };
    window.chosen = chosen;

    window.LoggedIn = function() {
        $('loginform').hide();

        $('buttons').show();
        $('newpost').show();
    }

    window.NotLoggedIn = function() {
        $('loginform').show();
        $('buttons').hide();
        $('post').hide();
        $('newpost').hide();
    }

    function PostChosen() {
        if (chosen.post) {
            $('subject').text(chosen.post.subject);
            $('poster').text(chosen.post.poster.name);
            $('time').text(new Date(chosen.post.time * 1000));
            $('message').text(chosen.post.body);
            $('post').show();
            $('newpost>form>line>button').text('Reply');
        } else {
            $('post').hide();
            $('newpost>form>line>button').text('New post');
        }
    }

    function LoadPhorum(callback) {
        $.ajax({
            type : 'GET',
            url : 'index.php?action=get_posts&index=0&count=50',
            success : function(result) {
                function build_tree(posts) {
                    var out = [], p, x;
                    for (x in posts) {
                        p = posts[x];
                        out.push({
                            'post' : p,
                            'text' : p.subject,
                            'children' : build_tree(p.children)
                        })
                    }
                    return out;
                }
                $('tree').jstree('destroy')
                $('tree').jstree({ 
                    'core' : {
                        'data' : [
                            {
                                'post' : null,
                                'text' : 'root',
                                'state' : { 'opened' : true },
                                'children' : build_tree(result.posts)
                            }
                        ]
                    }
                }).on('select_node.jstree', function(e, node) {
                    chosen.post = node.node.original.post;
                    chosen.node = node;
                    PostChosen();
                });
                if (callback) {
                    callback();
                }
            }
        });
    }

    $('#login_button').click(function() {
        $.ajax({
            type : 'POST',
            url : 'index.php?action=login',
            data : {
                username : $('input[name="username"]').val(),
                password : $('input[name="password"]').val()
            },
            success : function(res) {
                if (res.success) {
                    LoggedIn();
                } else {
                    alert('Bad credentials.');
                }
            }
        });
        return false;
    });

    $('#create_user_button').click(function() {
        $.ajax({
            type : 'POST',
            url : 'index.php?action=create_user',
            data : {
                username : $('input[name="username"]').val(),
                password : $('input[name="password"]').val()
            },
            success : function(res) {
                if (res.success) {
                    $('input[name="username"]').val('')
                    $('input[name="password"]').val('')
                    alert('User created - now log in.');
                } else {
                    alert('Could not create user - most likely the username was taken.');
                }
            }
        });
        return false;
    });

    $('#get_password').click(function() {
        $.ajax({
            type : 'GET',
            url : 'index.php?action=get_password',
            success : function(res) {
                alert('Your password is "' + res.password + '"');
            }
        });
    });

    $('#logout_button').click(function() {
        $.ajax({
            type : 'GET',
            url : 'index.php?action=logout',
            success : function(res) {
                NotLoggedIn();
            }
        });
    });


    $('newpost>form>line>button').click(function() {
        var data = {
            subject : $('input[name="subject"]').val(),
            body : $('textarea[name="body"]').val()
        };
        if (chosen.post) {
            data.parent_post = chosen.post.id;
        }
        $('input').val('');
        $('textarea').val('');
        $.ajax({
            type : 'POST',
            url : 'index.php?action=add_post',
            data : data,
            success : function(post) {
                LoadPhorum();
            }
        });
        return false;
    });

    LoadPhorum();
});
