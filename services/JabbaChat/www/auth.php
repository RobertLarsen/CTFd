<?php
    define('GENDER_MALE', 0);
    define('GENDER_FEMALE', 1);

    $mongo = new Mongo('mongodb://localhost');
    $db = $mongo->openfire;
    $users = $db->users;

    class User {
        public $username;
        public $name;
        public $gender;
        public $admin;
        public $email;
        public $created;
        public $modified;

        public function __construct($username, $name, $gender, $admin, $email, $created, $modified) {
            $this->username = $username;
            $this->name = $name;
            $this->gender = $gender;
            $this->admin = $admin;
            $this->email = $email;
            $this->created = $created;
            $this->modified = $modified;
        }
    }

    class Database {
        private $users;
        public function __construct($db = 'openfire') {
            $mongo = new Mongo('mongodb://localhost');
            $db = $mongo->$db;
            $this->users = $db->users;
        }

        function exists($username) {
            return $this->users->find(array('_id' => $username))->count() > 0;
        }

        function login($username, $password) {
            $u = $this->users->findOne(array('_id' => $username, 'password' => $password));
            if ($u) {
                $u = new User(
                    $u['_id'],
                    $u['name'],
                    $u['gender'],
                    isset($u['admin']) && $u['admin'] === true,
                    $u['email'],
                    $u['created'],
                    $u['modified']
                );
            }
            return $u;
        }

        function create($username, $password, $name, $gender, $email) {
            $now = time();
            $u = null;
            if ($this->exists($username) === false) {
                $this->users->save(array(
                    '_id' => $username,
                    'password' => $password,
                    'name' => $name,
                    'gender' => $gender,
                    'email' => $email,
                    'created' => $now,
                    'modified' => $now
                ));
                $u = $this->login($username, $password);
            }
            return $u;
        }
    }

    $db = new Database();
    if (isset($_POST['action'])) {
        switch ($_POST['action']) {
            case 'login':
                if (isset($_POST['username']) && isset($_POST['password'])) {
                    if ($db->login($_POST['username'], $_POST['password'])) {
                        header('HTTP/1.1 200 OK');
                        echo 'Login successful';
                    } else {
                        header('HTTP/1.1 500 Bad request');
                        echo 'Bad credentials';
                    }
                } else {
                    header('HTTP/1.1 500 Bad request');
                    echo 'Missing arguments for login';
                }
            break;
            case 'create':
                if (isset($_POST['username']) && isset($_POST['password']) && isset($_POST['name']) && isset($_POST['email']) && isset($_POST['gender'])) {
                    $g = $_POST['gender'];
                    if ($g === 'male' || $g === 'female') {
                        $g = ($g === 'male' ? GENDER_MALE : GENDER_FEMALE);
                        $u = $_POST['username'];
                        $p = $_POST['password'];
                        $n = $_POST['name'];
                        $m = $_POST['email'];
                        if ($db->create($u, $p, $n, $g, $m)) {
                            header('HTTP/1.1 200 OK');
                            echo 'User created successfully';
                        } else {
                            header('HTTP/1.1 500 Bad request');
                            echo 'Username exists';
                        }
                    } else {
                        header('HTTP/1.1 500 Bad request');
                        echo 'Gender should be either male or female';
                    }
                } else {
                    header('HTTP/1.1 500 Bad request');
                    echo 'Missing arguments for user creation';
                }
            break;
            default:
                header('HTTP/1.1 500 Bad request');
                echo 'Bad action: "' . $_POST['action'] . '"';
            break;
        }
    } else {
        header('HTTP/1.1 500 Bad request');
        echo 'No action specified';
    }
?>
