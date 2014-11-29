<?php
    session_start();
    
    $dbpath = 'database.sqlite';
    $exists = file_exists($dbpath);
    $db = new SQLite3($dbpath);
    $db->busyTimeout(500);
    if (!$exists) {
        $db->exec('create table users(id integer primary key autoincrement, name varchar(16), password varchar(64), unique(name));');
        $db->exec('create table statuses(id integer primary key autoincrement, user_id integer, time integer, text varchar(128));');
    }

    interface Page {
        public function contentType();
        public function render();
    }

    abstract class JSONPage implements Page {
        public function contentType() {
            return 'application/json; charset=utf8';
        }

        public function render() {
            return json_encode($this->json()) . "\n";
        }

        public abstract function json();
    }

    class AuthenticationJSONPage extends JSONPage {
        public function json() {
            global $db;
            $res = null;
            if (isset($_POST['username']) && isset($_POST['password'])) {
                $res = $db->querySingle('select id from users where name="' . $_POST['username'] . '" and password="' . $_POST['password'] . '"');
            }
            if ($res) {
                $_SESSION['me'] = array('id' => (int)$res, 'name' => $_POST['username']);
                return array('result' => true, 'id' => (int)$res);
            } else {
                unset($_SESSION['me']);
                return array('result' => false);
            }
        }
    }

    class UsercreationJSONPage extends JSONPage {
        public function json() {
            global $db;
            $res = null;
            if (isset($_POST['username']) && isset($_POST['password'])) {
                if ($db->exec('insert into users(name, password) values("' . $_POST['username'] . '", "' . $_POST['password'] . '")')) {
                    $res = (int)$db->lastInsertRowID();
                }
            }
            if ($res === null) {
                return array('result' => false);
            } else {
                $_SESSION['me'] = array('id' => $res, 'name' => $_POST['username']);
                return array('result' => true, 'id' => $res);
            }
        }
    }

    class IndexPage implements Page {
        public function contentType() {
            return 'text/html; charset=utf8';
        }

        public function render() {
            return $this->header() . $this->body() . $this->footer();
        }

        protected function header() {
            $s = <<<"EOF"
<!doctype html>
<html>
<head>
<style>
table {
    border: 1px solid black;
}
thead {
    background-color: green;
}
</style>
<script src="jquery-2.1.1.min.js"></script>
<script>
var me = 
EOF;
            if (isset($_SESSION['me'])) {
                $s .= json_encode($_SESSION['me']) . ';';
            } else {
                $s .= 'null;';
            }
            $s .= <<<"EOF"
</script>
<script src="mystatus.js"></script>
</head>
<body>
<h1>MyStatus</h1>
EOF;
            return $s;
        }

        protected function body() {
            return '<content/>';
        }

        protected function footer() {
            return <<<"EOF"
</body>
</html>
EOF;
        }
    }

    class ListStatusesJSONPage extends JSONPage {
        public function json() {
            global $db;
            $result = array(
                "result" => true,
                "entries" => array()
            );
            $first = ($_GET['first'] ? $_GET['first'] : 0);
            $count = ($_GET['count'] ? $_GET['count'] : 20);
            $count = min($count, 50);
            $res = $db->query("select u.name as name, s.text as text, s.time as time from users u, statuses s where u.id=s.user_id order by s.id desc limit $first, $count");
            while ($arr = $res->fetchArray()) {
                $result['entries'][] = array(
                    'user' => $arr['name'],
                    'text' => $arr['text'],
                    'time' => $arr['time']
                );
            }
            return $result;
        }
    }

    class ChangeStatusJSONPage extends JSONPage {
        public function json() {
            global $db;
            $res = array('result' => false);
            if (isset($_SESSION['me']) && isset($_POST['status'])) {
                $db->exec('INSERT INTO statuses(user_id, text, time) VALUES(' . $_SESSION['me']['id'] . ', "' . $_POST['status'] . '", CURRENT_TIME)');
                $res['result'] = true;
            }
            return $res;
        }
    }

    eval('$page = new ' . (isset($_GET['page']) ? $_GET['page'] : 'Index') . 'Page();');
    header('Content-Type: ' . $page->contentType());
    echo $page->render();
?>
