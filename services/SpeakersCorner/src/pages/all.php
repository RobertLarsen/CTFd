<?php
    require_once 'ui.php';

    function renderPage() {
        global $db;
        $first = 0;
        $max = 5;
        if (isset($_GET['first'])) {
            $first = (int)$_GET['first'];
        }
        if (isset($_GET['max'])) {
            $max = (int)$_GET['max'];
        }
?>
<h2>Latest blog entries</h2>
<?php
    $total = $db->getNumberOfBlogEntries();
    echo "<h3>Page " . ($first / $max + 1) . " of " . round(($total + $max - 1) / $max) . "</h3>";

    $blogEntries = $db->getLatestBlogEntries($max, $first);
    foreach ($blogEntries as $entry) {
        $writer = $db->getUserById($entry->owner_id);
        $element = new ShortBlogEntry($entry, $writer);
        echo $element->render();
    }
    $cur = 0;
    $p = 1;
    while ($cur < $total) {
        echo "<a href='index.php?page=all&max=$max&first=$cur'>$p</a> ";
        $p++;
        $cur += $max;
    }
?>
<?php
    }
?>
