<?php
    session_start();

    $MY_GLOBAL = array(
        'DB_DSN' => 'mysql:host=127.0.0.1;dbname=leet',
        'DB_USER' => 'root',
        'DB_PASS' => 'blar'
    );

    //Stupid magic quotes!!!
    foreach (array($_GET, $_POST, $_COOKIE) as $a) {
        foreach ($a as $key => $value) {
            $MY_GLOBAL[$key] = get_magic_quotes_gpc() && gettype($value) === 'string' ? stripslashes($value) : $value;
        }
    }

    class User {
        public $id;
        public $name;
        public $type;

        public function __construct($id, $name, $type) {
            $this->id = (int)$id;
            $this->name = $name;
            $this->type = $type;
        }
    }

    class Post {
        public $id;
        public $parent_post;
        public $poster;
        public $time;
        public $subject;
        public $body;
        public $children;

        public function __construct($id, $parent_post, $poster, $time, $subject, $body) {
            $this->id = (int)$id;
            $this->parent_post = $parent_post;
            $this->poster = $poster;
            $this->time = (int)$time;
            $this->subject = $subject;
            $this->body = $body;
            $this->children = array();
        }
    }

    function post_to_json(Post $post) {
        $p_out = new stdClass;
        $p_out->subject = $post->subject;
        $p_out->body = $post->body;
        $p_out->time = $post->time;
        $p_out->poster = new stdClass;
        $p_out->poster->name = $post->poster->name;
        $p_out->poster->id = $post->poster->id;
        $p_out->id = $post->id;
        $p_out->children = posts_to_json($post->children);
        return $p_out;
    }

    function posts_to_json(array $posts) {
        $out = array();
        foreach ($posts as $p_in) {
            $out[] = post_to_json($p_in);
        }
        return $out;
    }

    class Database {
        private $pdo;
        private $user_cache;

        public function __construct($dsn, $user, $pass) {
            $this->pdo = new PDO($dsn, $user, $pass);
            $this->user_cache = array();
        }

        public function authenticate($name, $password) {
            $result = false;
            $stmt = $this->pdo->prepare('SELECT id, type FROM users WHERE name=:name AND password=:password');
            $stmt->execute(array(
                ':name' => $name,
                ':password' => $password
            ));
            $stmt->bindColumn('id', $id);
            $stmt->bindColumn('type', $type);
            if ($stmt->fetch(PDO::FETCH_BOUND)) {
                $result = new User($id, $name, $type);
                $this->user_cache[] = $result;
            }
            return $result;
        }

        public function addUser($name, $password) {
            $stmt = $this->pdo->prepare('INSERT INTO users(`name`, `password`) VALUES(:name, :password)');
            if ($stmt->execute(array(':name' => $name, ':password' => $password))) {
                return $this->authenticate($name, $password);
            } else {
                $err = $stmt->errorInfo();
                throw new Exception($err[2]);
            }
        }

        private function _searchUserCacheById($id) {
            foreach ($this->user_cache as $u) {
                if ($u->id === (int)$id) {
                    return $u;
                }
            }
            return false;
        }

        public function getUserById($id) {
            $result = $this->_searchUserCacheById($id);
            if ($result === false) {
                $stmt = $this->pdo->prepare('SELECT name, type FROM users WHERE id=:id');
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->execute();
                $stmt->bindColumn('name', $name);
                $stmt->bindColumn('type', $type);
                if ($stmt->fetch(PDO::FETCH_BOUND)) {
                    $result = new User($id, $name, $type);
                    $this->user_cache[] = $result;
                }
            }
            return $result;
        }

        public function getPassword(User $user) {
            $result = false;
            $stmt = $this->pdo->prepare('SELECT password FROM users WHERE id=:id');
            $stmt->bindParam(':id', $user->id, PDO::PARAM_INT);
            $stmt->execute();
            $stmt->bindColumn('password', $password);
            if ($stmt->fetch(PDO::FETCH_BOUND)) {
                $result = $password;
            }
            return $result;
        }

        public function getPostById($id) {
            $post = false;
            $stmt = $this->pdo->prepare('SELECT *, unix_timestamp(time) as timestamp FROM posts WHERE id=:id');
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
            $stmt->execute();

            $all = $stmt->fetchAll();
            if (count($all) > 0) {
                $row = $all[0];
                $post = new Post($row['id'],
                                  $post,
                                  $this->getUserById((int)$row['poster_id']),
                                  $row['timestamp'],
                                  $row['subject'],
                                  $row['body']);
            }
            return $post;
        }

        public function addPost($subject, $body, User $poster, Post $parent = null) {
            $stmt = $this->pdo->prepare('INSERT INTO posts(parent_id, poster_id, subject, body) VALUES(:parent_id, :poster_id, :subject, :body)');
            $stmt->bindValue(':parent_id', $parent === null ? null : $parent->id, PDO::PARAM_INT);
            $stmt->bindValue(':poster_id', $poster->id, PDO::PARAM_INT);
            $stmt->bindValue(':subject', $subject, PDO::PARAM_STR);
            $stmt->bindValue(':body', $body, PDO::PARAM_STR);
            $stmt->execute();
            return $this->getPostById((int)$this->pdo->lastInsertId());
        }

        public function getTopPosts($index = 0, $count = 20) {
            $result = array();

            $stmt = $this->pdo->prepare('SELECT *, unix_timestamp(time) as timestamp FROM posts WHERE parent_id is NULL ORDER BY time DESC LIMIT :index, :count');
            $stmt->bindParam(':index', $index, PDO::PARAM_INT);
            $stmt->bindParam(':count', $count, PDO::PARAM_INT);
            $stmt->execute();

            $all = $stmt->fetchAll();
            foreach ($all as $row) {
                $post = new Post($row['id'],
                                  null,
                                  $this->getUserById((int)$row['poster_id']),
                                  $row['timestamp'],
                                  $row['subject'],
                                  $row['body']);
                $this->populatePost($post);
                $result[] = $post;
            }

            return $result;
        }

        public function populatePost(Post $post) {
            $stmt = $this->pdo->prepare('SELECT *, unix_timestamp(time) as timestamp FROM posts WHERE parent_id=:parent ORDER BY time');
            $stmt->execute(array(':parent' => $post->id));
            foreach ($stmt->fetchAll() as $row) {
                $child = new Post($row['id'],
                                  $post,
                                  $this->getUserById($row['poster_id']),
                                  $row['timestamp'],
                                  $row['subject'],
                                  $row['body']);
                $post->children[] = $child;
                $this->populatePost($child);
            }
            return $post;
        }
    }

    function check_authentication() {
        global $MY_GLOBAL;
        $me = false;
        if (isset($_SESSION['me']) === false) {
            if (isset($MY_GLOBAL['username']) && isset($MY_GLOBAL['password'])) {
                $me = $MY_GLOBAL['db']->authenticate($MY_GLOBAL['username'], $MY_GLOBAL['password']);
                if ($me) {
                    $_SESSION['me'] = $me;
                }
            }
        } else {
            $me = $_SESSION['me'];
        }
        return $me;
    }

    $MY_GLOBAL['db'] = new Database($MY_GLOBAL['DB_DSN'], $MY_GLOBAL['DB_USER'], $MY_GLOBAL['DB_PASS']);
    $MY_GLOBAL['me'] = check_authentication();

    if (isset($_GET['action'])) {
        header('Content-Type: application/json; charset=utf8');

        $obj = new stdClass;
        switch ($MY_GLOBAL['action']) {
            case 'create_user':
                try {
                    $MY_GLOBAL['db']->addUser($MY_GLOBAL['username'], $MY_GLOBAL['password']);
                    $obj->success = true;
                } catch (Exception $e) {
                    $obj->success = false;
                    $obj->error = $e->getMessage();
                }
            break;
            case 'login':
                $obj->success = ($MY_GLOBAL['me'] !== false);
            break;
            case 'logout':
                unset($MY_GLOBAL['me']);
                unset($_SESSION['me']);
                $obj->success = true;
            break;
            case 'get_posts':
                $index = isset($MY_GLOBAL['index']) ? (int)$MY_GLOBAL['index'] : 0;
                $count = isset($MY_GLOBAL['count']) ? (int)$MY_GLOBAL['count'] : 20;
                $obj->posts = posts_to_json($MY_GLOBAL['db']->getTopPosts($index, $count));
                $obj->success = true;
            break;
            case 'get_password':
                if ($MY_GLOBAL['me']) {
                    $obj->password = $MY_GLOBAL['db']->getPassword($MY_GLOBAL['me']);
                    $obj->success = true;
                } else {
                    $obj->success = false;
                    $obj->message = 'Only for logged in users.';
                }
            break;
            case 'add_post':
                if ($MY_GLOBAL['me']) {
                    $parent = null;
                    if (isset($MY_GLOBAL['parent_post'])) {
                        $parent = $MY_GLOBAL['db']->getPostById($MY_GLOBAL['parent_post']);
                    }
                    if ($parent === false) {
                        $obj->success = false;
                        $obj->message = 'No such parent post';
                    }
                    $obj->post = post_to_json($MY_GLOBAL['db']->addPost($MY_GLOBAL['subject'], $MY_GLOBAL['body'], $MY_GLOBAL['me'], $parent));
                    $obj->success = true;
                } else {
                    $obj->success = false;
                    $obj->message = 'Log in first';
                }
            break;
        }
        print json_encode($obj);
    } else {
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Leet Phorum - for them 1337 h4x0rz</title>
        <link rel="stylesheet" type="text/css" href="leet.css"/>
        <link rel="stylesheet" href="js/themes/default/style.min.css" />
        <script src="js/jquery-2.1.1.min.js"></script>
        <!-- http://www.jstree.com/ -->
        <script src="js/jstree.min.js"></script>
        <script src="js/leet.js"></script>
        <?php if ($MY_GLOBAL['me']) { ?>
        <script>$(function() { LoggedIn(); });</script>
        <?php } else { ?>
        <script>$(function() { NotLoggedIn(); });</script>
        <?php } ?>
    </head>
    <body>
        <header>
            <h1>Leet Phorum - for them 1337 h4x0rz</h1>
        </header>
        <content>
            <left>
                <buttons>
                    <button id="logout_button">Log out</button><br/>
                    <button id="get_password">My password?</button>
                </buttons>
                <tree></tree>
            </left>
            <right>
                <post>
                    <line>Subject: <subject/></line>
                    <line>Poster: <poster/></line>
                    <line>Time: <time/></line>
                    <message/>
                </post>
                <newpost>
                    <form>
                        <line>Subject: <input type="text" name="subject"/></line>
                        <line><textarea name="body" rows="5" cols="50"></textarea></line>
                        <line><button>New post</button></line>
                    </form>
                </newpost>
                <loginform>
                    <h2>Login or create user</h2>
                    <form>
                        Username: <input type="text" name="username"><br/>
                        Password: <input type="password" name="password"><br/>
                        <button id="login_button">Login</button><button id="create_user_button">Create user</button>
                    </form>
                </loginform>
            </right>
        </content>
        <footer>
        </footer>
    </body>
</html>
<?php } ?>
