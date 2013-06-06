<?php
    session_start();
    include_once "database.php";
    $bad_login = false;
    $db = new Database();
    if (isset($_SESSION['current_user_id'])) {
        $me = $db->getUserById($_SESSION['current_user_id']);
    }

    if ($me === null && isset($_POST['action']) && $_POST['action'] === 'login') {
        if (isset($_POST['username']) && isset($_POST['password'])) {
            if ($me = $db->authenticate($_POST['username'], $_POST['password'])) {
                $_SESSION['current_user_id'] = $me->id;
            } else {
                $bad_login = true;
            }
        }
    }

    $pages = array();
    $dir = opendir("pages");
    while ($entry = readdir($dir)) {
        if (preg_match('/\.php$/', $entry)) {
            $pages[substr($entry, 0, -4)] = 'pages/' . $entry;
        }
    }
    closedir($dir);

    $page = isset($_GET['page']) ? $_GET['page'] : "home";
    if (!isset($pages[$page])) {
        $page = "home";
    }
    
    include $pages[$page];
?>
<html>
    <head>
        <link rel="stylesheet" href="style.css" type="text/css" media="all" />
    </head>
    <body>
        <h1>Speakers Corner</h1>
        <div class="menu">
            <a class="menuitem" href="index.php?page=home">Home</a>
            <a class="menuitem" href="index.php?page=active">Active bloggers</a>
            <a class="menuitem" href="index.php?page=all">All blogs</a>
            <?php
                if ($me !== null) {
            ?>
                <a class="menuitem" href="index.php?page=newblog">New blog entry</a>
            <?php
                }
            ?>
            <?php
                if ($me === null) {
            ?>
            <br/><br/>
            <form action="<?php echo $_SERVER['REQUEST_URI']; ?>" method="post">
                <?php if ($bad_login) { echo "Bad login<br/>"; } ?>
                <input type="hidden" name="action" value="login"/>
                Username: <input type="text" name="username"/>
                Password: <input type="password" name="password"/>
                <input type="submit" value="Login"/>
                <button onClick="location.href='index.php?page=newuser';return false;">New user</button>
            </form>
            <?php
                } else {
            ?>
                <span class="loggedin">Logged in as <?php echo htmlentities($me->name); ?></span>
            <?php
                }
            ?>
        </div>
        <div class="content">
            <?php
                renderPage();
            ?>
        </div>
    </body>
</html>
