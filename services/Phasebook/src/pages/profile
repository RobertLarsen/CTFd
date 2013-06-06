<?php
    $u = $db->getUserById($_GET['userid']);
    if ($u === null) {
?>
<h3>No user by that id</h3>
<?php
    } else {
?>
<h3><?php echo $u->name; ?></h3>
<p>
<?php $img = new UserIMG($u); echo $img->render(); ?>
</p>
<?php
    }
?>
