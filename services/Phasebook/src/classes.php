<?php
    define("GENDER_MALE",   0);
    define("GENDER_FEMALE", 1);

    class User {
        public $id;
        public $name;
        public $gender;

        public function __construct($id, $name, $gender) {
            $this->id = (int)$id;
            $this->name = $name;
            $this->gender = (int)$gender;
        }

        public function profileImagePath() {
            $path = $GLOBALS['CONFIG']['path']['profileimgs'] . '/' . $this->id . '.';
            foreach ($GLOBALS['CONFIG']['image_info'] as $extension => $mime) {
                $p = $path . $extension;
                if (file_exists($p)) {
                    return $p;
                }
            }

            return User::getDefaultProfileImage($this->gender);
        }

        public function getDefaultProfileImage($gender) {
            return $GLOBALS['CONFIG']['path']['img'] . ($gender === 0 ? '/guy.png' : '/gal.png');
        }
    }

    interface Component {
        public function render();
    }

    class UserIMG implements Component {
        private $user;
        public function __construct(User $user) {
            $this->user = $user;
        }

        public function render() {
            return '<img class="profileimage" src="' . $this->user->profileImagePath() . '"/>';
        }
    }

    class UserTD implements Component {
        private $user;
        public function __construct(User $user = null) {
            $this->user = $user;
        }

        public function render() {
            if ($this->user === null) {
                return '<td>&nbsp;</td>';
            } else {
                $img = new UserIMG($this->user);
                return '<td onclick="location.href=' . "'" . $_SERVER['SCRIPT_NAME'] . '?p=profile&userid=' . $this->user->id . "'" . '">' . $this->user->name . '<br/>' . $img->render() . '</td>';
            }
        }
    }

    abstract class Menu implements Component {
        public static function getMenu($database) {
            if ($database->isLoggedIn()) {
                return new LoggedInMenu();
            } else {
                return new LoggedOutMenu();
            }
        }
    }

    class LoggedInMenu extends Menu {
        public function render() {
            $u = $_SESSION['user'];
            $img = new UserIMG($u);
            return "Logged in as " . $u->name . "<br/>" .
            $img->render() . "<br/>" .
            '<a href="' . $_SERVER['SCRIPT_NAME'] . '?p=new_avatar">New avatar</a><br/>' .
            '<form action="' . $_SERVER['SCRIPT_NAME'] . '?p=usersearch" method="post">' .
            ' Search user: <input type="text" name="username"/>' .
            '</form>';
        }
    }

    class LoggedOutMenu extends Menu {
        public function render() {
            $str = '<form action="' . $_SERVER['SCRIPT_NAME'] . '" name="login_form" method="post">' 
                  .' <input type="hidden" name="login"/>'
                  .' <table>'
                  .'  <tr><td>Name:</td><td><input size="10" type="text" name="user"/></td></tr>'
                  .'  <tr><td>Password:</td><td><input size="10" type="password" name="password"/></td></tr>'
                  .'  <tr><td colspan="2" align="center"><input type="submit" value="Login"/><button onClick="goCreate();return false;">New user</button></td></tr>'
                  .' </table>'
                  .'</form>';
            return $str;
        }
    }
?>
