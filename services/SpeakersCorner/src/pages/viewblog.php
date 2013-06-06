<?php
    require_once 'ui.php';

    if (!isset($_GET['blogid'])) {
        header("Location: index.php");
    }

    $id = (int)$_GET['blogid'];
    $blogentry = $db->getBlogEntryById($id);

    if ($me !== null && isset($_POST['action']) && $_POST['action'] === "addcomment" && isset($_POST['comment'])) {
        $db->createBlogComment($me, $blogentry, $_POST['comment']);
    }

    function renderPage() {
        global $db;
        global $me;
        global $blogentry;

        $users = array();
        if ($blogentry === null) {
            echo "I could not find the blog that you requested. Sorry!";
        } else {
            $users[$blogentry->owner_id] = $db->getUserById($blogentry->owner_id);
            $element = new LongBlogEntry($blogentry, $users[$blogentry->owner_id]);
            echo $element->render();

            foreach ($db->getBlogComments($blogentry->id) as $comment) {
                if (!isset($users[$comment->owner_id])) {
                    $users[$comment->owner_id] = $db->getUserById($comment->owner_id);
                }
                $element = new BlogCommentElement($comment, $users[$comment->owner_id]);
                echo $element->render();
            }

            if ($me !== null) {
                $element = new BlogCommentForm($blogentry);
                echo $element->render();
            }
        }
    }
?>
