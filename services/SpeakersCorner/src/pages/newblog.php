<?php
    if ($me === null) {
        header("Location: index.php");
    }

    if (isset($_POST['action']) && $_POST['action'] === 'blogentry') {
        if (isset($_POST['subject']) && isset($_POST['text'])) {
            if ($blog = $db->createBlogEntry($me, $_POST['subject'], $_POST['text'])) {
                header("Location: index.php?page=viewblog&blogid=" . $blog->id);
            }
        }
    }

    function renderPage() {
?>
<h2>New blog entry</h2>
<form action="index.php?page=newblog" method="post">
    <input type="hidden" name="action" value="blogentry"/>
    Subject: <input type="text" name="subject"/><br/>
    <textarea rows="30" cols="100" name="text"></textarea><br/>
    <input type="submit" value="Add"/>
</form>
<?php
    }
?>
