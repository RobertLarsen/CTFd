<?php
    include_once 'classes.php';

    class Database {
        private $con;
        public function __construct(array $db_config) {
            $this->con = mysql_connect($db_config['host'], $db_config['user'], $db_config['pass']);
            if (!$this->con) {
                echo "Could not get database connection: " . mysql_error();
                exit;
            }
            if (!mysql_select_db($db_config['name'], $this->con)) {
                echo "Could not select database: " . mysql_error();
                exit;
            }
        }

        public function searchUsers($match) {
            $result = array();
            $q = mysql_query("SELECT username, id, gender FROM users WHERE username LIKE '%$match%' ORDER BY username LIMIT 15");
            while ($arr = mysql_fetch_array($q)) {
                $result[] = new User((int)$arr['id'], $arr['username'], (int)$arr['gender']);
            }
            return $result;
        }

        public function createAccount($name, $pass, $gender) {
            $result = false;
            $sql = "INSERT INTO users(username, password, gender) VALUES('" . mysql_real_escape_string($name, $this->con) . "', '" . mysql_real_escape_string($pass, $this->con) . "', $gender)";
            if (mysql_query($sql)) {
                $result = true;
            }
            return $result;
        }

        private function auth($name, $pass) {
            $user = false;
            $sql = "SELECT id, gender FROM users WHERE username='" . mysql_real_escape_string($name, $this->con) . "' AND password='" . mysql_real_escape_string($pass, $this->con) . "'";
            $res = mysql_query($sql, $this->con);
            if ($arr = mysql_fetch_array($res)) {
                $user = new User((int)$arr['id'], $name, (int)$arr['gender']);
            }
            return $user;
        }

        public function getUserById($id) {
            $user = false;
            $sql = "SELECT username, gender FROM users WHERE id=$id";
            $res = mysql_query($sql, $this->con);
            if ($arr = mysql_fetch_array($res)) {
                $user = new User($id, $arr['username'], (int)$arr['gender']);
            }
            return $user;
        }

        public function isLoggedIn() {
            if (isset($_POST['login']) && isset($_POST['user']) && isset($_POST['password'])) {
                $user = $this->auth($_POST['user'], $_POST['password']);
                if ($user) {
                    $_SESSION['user'] = $user;
                } else {
                    unset($_SESSION['user']);
                }
            } else if (isset($_POST['logout'])) {
                unset($_SESSION['user']);
            }

            return isset($_SESSION['user']);
        }

        public function getLatestUsers($max) {
            $users = array();
            $sql = "SELECT id, username, gender FROM users ORDER BY id DESC LIMIT $max";
            $res = mysql_query($sql, $this->con);
            while ($arr = mysql_fetch_array($res)) {
                $users[] = new User((int)$arr['id'], $arr['username'], (int)$arr['gender']);
            }
            return $users;
        }
    }
?>
