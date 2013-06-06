<?php
    class User {
        public $name;
        public $id;

        public function __construct($name, $id) {
            $this->name = $name;
            $this->id = $id;
        }

        public function __toString() {
            return "User(" . $this->name . "," . $this->id . ")";
        }
    }

    class BlogEntry {
        public $id;
        public $owner_id;
        public $timestamp;
        public $subject;
        public $text;

        public function __construct($id, $owner_id, $timestamp, $subject, $text) {
            $this->id        = $id;
            $this->owner_id  = $owner_id;
            $this->timestamp = $timestamp;
            $this->subject   = $subject;
            $this->text      = $text;
        }

        public function __toString() {
            return "BlogEntry(" . $this->id . ", " . $this->owner_id . ", " . $this->timestamp . ", '" . $this->subject . "', '" . $this->text . "')";
        }
    }

    class BlogComment {
        public $id;
        public $owner_id;
        public $blogentry_id;
        public $timestamp;
        public $text;

        public function __construct($id, $owner_id, $blogentry_id, $timestamp, $text) {
            $this->id           = $id;
            $this->owner_id     = $owner_id;
            $this->blogentry_id = $blogentry_id;
            $this->timestamp    = $timestamp;
            $this->text         = $text;
        }

        public function __toString() {
            return "BlogComment(" . $this->id . ", " . $this->owner_id . ", " . $this->blogentry_id . ", " . $this->timestamp . ", '" . $this->text . "')";
        }
    }
?>
