$(function() {
    function LoadStatuses() {
        $.ajax({
            type : 'GET',
            url : 'index.php?page=ListStatusesJSON',
            success : function(data) {
                var html = '<table><thead><tr><td>Time</td><td>User</td><td>Status</td></tr></thead><tbody>',
                    i, entry;
                for (i in data.entries) {
                    entry = data.entries[i];
                    html += '<tr><td>' + $('<div>').text(entry.time).html() + '</td><td>' + $('<div>').text(entry.user).html() + '</td><td>' + $('<div>').text(entry.text).html() + '</td></tr>';
                }
                html += '</tbody></table>';
                $('statuses').html(html);
            }
        });
    }

    function LoggedIn() {
        $('content').html('<h2>Update your status</h2><form>New status: <input type="text"/></form><statuses/>');
        $('form').submit(function() {
            var new_status = $('input').val();
            $('input').val('');
            $.ajax({
                type : 'POST',
                url : 'index.php?page=ChangeStatusJSON',
                data : {
                    status : new_status
                },
                success : function() {
                    LoadStatuses();
                }
            });
            return false;
        });
        LoadStatuses();
    }

    if (me === null) {
        $('content').html(
            '<h2>Login or create user</h2>' +
            '<form>' +
            'Name: <input type="text" name="name"/><br/>' +
            'Password: <input type="password" name="password"/><br/>' +
            '<button name="login">Login</button><button name="create">Create</button>' +
            '</form>'
        );
        $('button[name="login"]').click(function() {
            var name = $('input[name="name"]').val(),
                pass = $('input[name="password"]').val();
            $.ajax({
                type : 'POST',
                url : 'index.php?page=AuthenticationJSON',
                data : {
                    username : name,
                    password : pass
                },
                success : function(data) {
                    if (data.result) {
                        me = {
                            id : data.id,
                            name : name
                        };
                        LoggedIn();
                    } else {
                        alert('Bad credentials');
                    }
                }
            });
            return false;
        });
        $('button[name="create"]').click(function() {
            var name = $('input[name="name"]').val(),
                pass = $('input[name="password"]').val();
            $.ajax({
                type : 'POST',
                url : 'index.php?page=UsercreationJSON',
                data : {
                    username : name,
                    password : pass
                },
                success : function(data) {
                    if (data.result) {
                        me = {
                            id : data.id,
                            name : name
                        };
                        LoggedIn();
                    } else {
                        alert('Username is taken');
                    }
                }
            });
            return false;
        });
    } else {
        LoggedIn();
    }
});
