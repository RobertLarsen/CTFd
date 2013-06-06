<?php
    if (isset($me) && $me !== null) {
        header("Location: index.php");
    }

    if (isset($_POST['action']) && $_POST['action'] === "createuser") {
        if (isset($_POST['username']) && isset($_POST['password1']) && isset($_POST['password2'])) {
            if ($_POST['password1'] === $_POST['password2']) {
                if ($user = $db->createUser($_POST['username'], $_POST['password1'])) {
                    $_SESSION['current_user_id'] = $user->id;
                    header("Location: index.php");
                }
            }
        }
    }

    function renderPage() {
        global $me;
        if ($me === null) {
?>
<h2>Create new user account</h2>
<form action="index.php?page=newuser" method="post">
    <input type="hidden" name="action" value="createuser"/>
    <table>
        <tr>
            <td>
                Username:
            </td>
            <td>
                <input type="text" name="username"/>
            </td>
        </tr>
        <tr>
            <td>
                Password:
            </td>
            <td>
                <input type="password" name="password1"/>
            </td>
        </tr>
        <tr>
            <td>
                Repeat:
            </td>
            <td>
                <input type="password" name="password2"/>
            </td>
        </tr>
        <tr>
            <td colspan="2" align="center">
                <input type="submit" value="Create"/>
            </td>
        </tr>
    </table>
</form>
<?php
        } else {
?>
    User created.
<?php
        }
    }
?>
