<?php
    require_once 'ui.php';

    function renderPage() {
        global $db;
?>
<h2>Blogging for bloggers</h2>
<div class="home">
Here at last. Sign up for your own account and exercise your right to blog and comment!<br/>
Come on. You know you want to.
</div>
<h3>Latest blog entries</h3>
<?
        $blogEntries = $db->getLatestBlogEntries(3, 0);
        foreach ($blogEntries as $entry) {
            $writer = $db->getUserById($entry->owner_id);
            $element = new ShortBlogEntry($entry, $writer);
            echo $element->render();
        }
    }
?>
