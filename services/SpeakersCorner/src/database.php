<?php
    include_once "model.php";

    class Database {
        private $db;
        public function __construct($path = "speaker.sqlite") {
            if (strlen($path) === 0) {
                $path = "speaker.sqlite";
            }
            if ($path[0] === '/') {
                $uri = "sqlite:$path";
            } else {
                $uri = "sqlite:" . getcwd() . '/' . $path;
            }
            $exists = file_exists($path);
            $this->db = new PDO($uri);
            if (!$exists) {
                $this->initialize();
            }
        }

        private function initialize() {
            $this->db->exec(
                'create table users(' .
                    'id integer primary key autoincrement,' .
                    'name text unique,' .
                    'password text)'
            );
            $this->db->exec(
                'create table blogentries(' .
                    'id integer primary key autoincrement,' .
                    'ownerid integer,' .
                    'timestamp integer,' .
                    'subject text,' .
                    'body text)'
            );
            $this->db->exec(
                'create table blogcomments(' .
                    'id integer primary key autoincrement,' .
                    'ownerid integer,' .
                    'blogentryid integer,' .
                    'timestamp integer,' .
                    'body text)'
            );
        }

        public function getNumberOfBlogEntries() {
            $sql = "select count(*) as count from blogentries";
            $result = $this->db->query($sql)->fetch();
            return $result['count'];
        }

        private function getBlogEntries($sql) {
            $result = array();
            $query = $this->db->query($sql);
            while ($a = $query->fetch()) {
                $result[] = new BlogEntry($a['id'], $a['ownerid'], $a['timestamp'], $a['subject'], $a['body']);
            }
            return $result;
        }

        public function getBlogEntryById($id) {
            $entries = $this->getBlogEntries("select * from blogentries where id=" . $this->db->quote($id));
            return count($entries) > 0 ? $entries[0] : null;
        }

        public function getLatestBlogEntries($num = 100, $first = 0) {
            $num = (int)$num;
            $first = (int)$first;
            return $this->getBlogEntries("select * from blogentries order by timestamp desc limit $num offset $first");
        }

        public function createUser($name, $password) {
            $result = false;
            $sql = "insert into users(name, password) values(" . $this->db->quote($name) . "," . $this->db->quote($password) . ")";
            if ($this->db->exec($sql)) {
                $result = new User($name, $this->db->lastInsertId());
            }
            return $result;
        }

        public function getUserById($id) {
            $result = false;
            $sql = "select name from users where id=" . $this->db->quote($id);
            if ($query = $this->db->query($sql)->fetch()) {
                $result = new User($query['name'], $id);
            }
            return $result;
        }

        public function authenticate($name, $password) {
            $result = null;
            $sql = "select id from users where name=" . $this->db->quote($name) . " and password=" . $this->db->quote($password);

            if ($query = $this->db->query($sql)->fetch()) {
                $result = new User($name, $query['id']);
            }
            return $result;
        }

        public function createBlogEntry(User $owner, $subject, $text) {
            $time = time();
            $ownerid = $owner->id;
            $subject = $this->db->quote($subject) ;
            $txt = $this->db->quote($text) ;
            $result = false;
            $sql = "insert into blogentries(ownerid, timestamp, subject, body) values($ownerid,$time,$subject,$txt)";
            if ($this->db->exec($sql)) {
                $result = new BlogEntry($this->db->lastInsertId(),$ownerid,$time,$subject,$text);
            }
            return $result;
        }

        public function createBlogComment(User $owner, BlogEntry $blog, $text) {
            $time = time();
            $ownerid = $owner->id;
            $entryid = $blog->id;
            $txt = $this->db->quote($text);
            $result = false;
            $sql = "insert into blogcomments(ownerid, blogentryid, timestamp, body) values($ownerid,$entryid,$time,$txt)";
            if ($this->db->exec($sql)) {
                $result = new BlogComment($this->db->lastInsertId(), $ownerid, $entryid, $time, $text);
            }
            return $result;
        }

        public function getBlogComments($blogentryid) {
            $result = array();
            $blogentryid = $this->db->quote($blogentryid);
            $sql = "select * from blogcomments where blogentryid=$blogentryid order by id";
            $query = $this->db->query($sql);
            while ($a = $query->fetch()) {
                $result[] = new BlogComment($a['id'], $a['ownerid'], $a['blogentryid'], $a['timestamp'], $a['body']);
            }
            return $result;
        }
    }
?>
