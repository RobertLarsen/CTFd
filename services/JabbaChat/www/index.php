<!DOCTYPE HTML>
<html>
    <head>
        <link rel="stylesheet" href="css/jabba.css"/>
        <link rel="stylesheet" href="css/jquery-ui-1.9.2.custom.min.css"/>
        <script src="js/jquery.min.js"></script>
        <script src="js/jquery-ui.min.js"></script>
        <script src="js/strophe.min.js"></script>
        <script src="js/underscore-min.js"></script>
        <script src="js/jabba.js"></script>
    </head>
    <body>
        <div id="login_dialog" class="hidden">
            <label>Username:</label><input type="text" id="l_username" value="admin"/>
            <label>Password:</label><input type="password" id="l_password" value="admin"/>
        </div>
        <div id="create_dialog" class="hidden">
            <label>Username:</label><input type="text" id="c_username"/><br/>
            <label>Password:</label><input type="password" id="c_password1"/><br/>
            <label>Password again:</label><input type="password" id="c_password2"/><br/>
            <label>Real name:</label><input type="text" id="c_name"/><br/>
            <label>E-mail:</label><input type="text" id="c_email"/><br/>
            <label>Gender:</label><div id="c_gender">
                <input type="radio" id="c_radio1" name="gender" checked="checked" value="male"><label for="radio1">Male</label>
                <input type="radio" id="c_radio2" name="gender" value="female"><label for="radio2">Female</label>
            </div>
        </div>
        <div id="chat" class="hidden">
            <div id="header">
                <h1>JabbaChat</h1>
            </div>
            <div id="text"></div>
            <div id="users"></div>
            <div id="input">
                <form>
                    <input id="chat_input" type="text"/>
                </form>
            </div>
        </div>
    </body>
</html>
