<?php
    include_once 'classes.php';
    session_start();
    include_once 'config.php';
    include_once 'db.php';
    $db = new Database($CONFIG['db']);
    $page = (isset($_GET['p']) && file_exists('pages/' . $_GET['p']) ? $_GET['p'] : 'main');
?>
<html>
    <head>
        <style>
            h1, h2 {
                text-align: center;
            }
            .headline {
                position: absolute;
                height: 150px;
                left: 0px;
                right: 0px;
            }
            .menu {
                position: absolute;
                width: 210px;
                top: 150px;
                bottom: 0px;
            }
            .content {
                border-left: 1px black solid;
                border-top: 1px black solid;
                padding: 10px;
                position: absolute;
                left: 220px;
                top: 150px;
                bottom: 0px;
                right: 0px;
            }
            .userlist td {
                text-align: center;
                border: 1px solid black;
                width: 100px;
                height: 200px;
            }
            .profileimage {
                width: 100px;
            }
        </style>
        <script>
            function goCreate() {
                location.href = "?p=create";
                return false;
            }
        </script>
    </head>
    <body>
        <div class="headline" onclick="location.href='<?php echo $_SERVER['SCRIPT_NAME']; ?>';">
            <h1>Phasebook</h1>
            <h2>Because privacy is overrated</h2>
        </div>
        <div class="menu">
            <?php
                echo Menu::getMenu($db)->render();
            ?>
        </div>
        <div class="content">
            <?php
                include_once "pages/" . $page;
            ?>
        </div>
    </body>
</html>
