<?php
    include_once "config.php";

    function endswith($str, $ending) {
        return strlen($str) < strlen($ending) ? FALSE :
               substr($str, -strlen($ending)) === $ending;
    }

    $errormsg = null;
    $name = null;

    if (isset($_FILES['upload'])) {
        $u = $_FILES['upload'];
        if ($u['error'] === UPLOAD_ERR_OK) {
            $name = $u['name'];
            while ($name[0] === '.') {
                $name = substr($name, 1);
            }
            if (endswith($name, ".txt") === false) {
                $name .= ".txt";
            }
            $dst = $config['upload_directory'] . "/" . $name;
            if (file_exists($dst)) {
                $errormsg = "File exists already";
            } else {
                move_uploaded_file($u['tmp_name'], $dst);
            }
        } else {
            $errormsg = "The file could not be uploaded. Maybe it was too big.";
        }
    }
?>
<html>
    <head>
        <style type="text/css">
            .err {
                color: #ff0000;
            }
            .uploaded {
                color: #00ff00;
            }
        </style>
    </head>
    <body>
        <center>
            <img alt="RabbitShare" src="rabbitshare_logo.png"/><br>
            Upload any textfile. If the file does not have a '.txt' extension, one will be added.<br/>
            Note that the uploaded files will be kept secret. You will need to know their names to download them.
            <form enctype="multipart/form-data" action="index.php" method="POST">
                <input type="hidden" name="MAX_FILE_SIZE" value="<?php echo $config['max_file_size']; ?>"/>
                <input name="upload" type="file"/> <input type="submit" value="Upload"/>
            </form>
            <?php
                if (isset($_FILES['upload'])) {
                    if ($errormsg !== null) {
                        echo "<span class=\"err\">$errormsg</span>";
                    } else {
                        $url = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . $config['upload_url'] . $name;
                        echo "<span class=\"uploaded\">File uploaded. Download it from <a href=\"$url\">$url</a></span>";
                        echo "IT IS IMPORTANT THAT YOU REMEMBER THIS URL AS YOU WILL NOT BE ABLE TO ACCESS YOUR UPLOADED FILE IF YOU FORGET IT!";
                    }
                }
            ?>
        </center>
    </body>
</html>
