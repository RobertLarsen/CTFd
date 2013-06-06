<?php
    abstract class UIElement {
        public abstract function render();
    }

    class ShortBlogEntry extends UIElement {
        private $entry;
        private $writer;
        public function __construct(BlogEntry $entry, User $writer) {
            $this->entry = $entry;
            $this->writer = $writer;
        }

        public function render() {
            $max = 100;
            $t = date("F j.", $this->entry->timestamp);
            $text = strlen($this->entry->text) > $max ? substr($this->entry->text, 0, $max - 3) . "..." : $this->entry->text;
            $data  = '<div class="blogshort" onClick="location.href='. "'" . 'index.php?page=viewblog&blogid=' . $this->entry->id . "'" . ';">';
            $data .= '<div class="blogshortsubject">' . htmlentities($this->entry->subject) . '</div>';
            $data .= '<div class="blogshortnamedate">' . htmlentities($this->writer->name) . ' - ' . $t . '</div>';
            $data .= '<div class="blogshorttext">' . htmlentities($text) . '</div>';
            $data .= '</div>';

            return $data;
        }
    }

    class LongBlogEntry extends UIElement {
        private $entry;
        private $writer;
        public function __construct(BlogEntry $entry, User $writer) {
            $this->entry = $entry;
            $this->writer = $writer;
        }

        public function render() {
            $t = date("F j. H:i", $this->entry->timestamp);
            $data  = '<div class="bloglong">';
            $data .= '<h3 class="bloglongsubject">' . htmlentities($this->entry->subject) . '</h3>';
            $data .= '<div class="bloglongnamedate">' . htmlentities($this->writer->name) . ' - ' . $t . '</div>';
            $data .= '<div class="bloglongtext">' . nl2br(htmlentities($this->entry->text)) . '</div>';
            $data .= '</div>';
            return $data;
        }
    }

    class BlogCommentElement extends UIElement {
        private $comment;
        private $writer;
        public function __construct(BlogComment $comment, User $writer) {
            $this->comment = $comment;
            $this->writer = $writer;
        }

        public function render() {
            $t = date("F j. H:i", $this->comment->timestamp);
            $data  = '<div class="blogcomment">';
            $data .= '<div class="blogcommentnamedate">' . htmlentities($this->writer->name) . ' - ' . $t . '</div>';
            $data .= '<div class="blogcommenttext">' . nl2br(htmlentities($this->comment->text)) . '</div>';
            $data .= '</div>';

            return $data;
        }
    }

    class BlogCommentForm extends UIElement {
        private $entry;
        public function __construct(BlogEntry $entry) {
            $this->entry = $entry;
        }

        public function render() {
            $data  = '<div class="blogcommentform">';
            $data .= '<form action="index.php?' . $_SERVER['QUERY_STRING'] . '" method="post">';
            $data .= '<input type="hidden" name="action" value="addcomment"/>';
            $data .= '<textarea rows="10" cols="50" name="comment"></textarea><br/>';
            $data .= '<input type="submit" value="Add comment"/>';
            $data .= '</form>';
            $data .= '</div>';

            return $data;
        }
    }
?>
