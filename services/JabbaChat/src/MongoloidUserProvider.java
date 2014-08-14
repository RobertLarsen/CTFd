import org.jivesoftware.openfire.user.UserProvider;
import org.jivesoftware.openfire.user.User;
import org.jivesoftware.openfire.user.UserNotFoundException;
import org.jivesoftware.openfire.user.UserAlreadyExistsException;
import java.util.Collection;
import java.util.Date;
import java.util.Set;

public class MongoloidUserProvider implements UserProvider {
    public User loadUser(String username) throws UserNotFoundException {
        return MongoloidDatabase.getInstance().getUserProvider().loadUser(username);
    }

    public User createUser(String username, String password, String name, String email) throws UserAlreadyExistsException {
        return MongoloidDatabase.getInstance().getUserProvider().createUser(username, password, name, email);
    }

    public void deleteUser(String username) {
        MongoloidDatabase.getInstance().getUserProvider().deleteUser(username);
    }

    public int getUserCount() {
        return MongoloidDatabase.getInstance().getUserProvider().getUserCount();
    }

    public Collection<User> getUsers() {
        return MongoloidDatabase.getInstance().getUserProvider().getUsers();
    }

    public Collection<String> getUsernames() {
        return MongoloidDatabase.getInstance().getUserProvider().getUsernames();
    }

    public Collection<User> getUsers(int startIndex, int numResults) {
        return MongoloidDatabase.getInstance().getUserProvider().getUsers(startIndex, numResults);
    }

    public void setName(String username, String name) throws UserNotFoundException {
        MongoloidDatabase.getInstance().getUserProvider().setName(username, name);
    }

    public void setEmail(String username, String email) throws UserNotFoundException {
        MongoloidDatabase.getInstance().getUserProvider().setEmail(username, email);
    }

    public void setCreationDate(String username, Date creationDate) throws UserNotFoundException {
        MongoloidDatabase.getInstance().getUserProvider().setCreationDate(username, creationDate);
    }

    public void setModificationDate(String username, Date modificationDate) throws UserNotFoundException {
        MongoloidDatabase.getInstance().getUserProvider().setModificationDate(username, modificationDate);
    }

    public Set<String> getSearchFields() throws UnsupportedOperationException {
        return MongoloidDatabase.getInstance().getUserProvider().getSearchFields();
    }

    public Collection<User> findUsers(Set<String> fields, String query) throws UnsupportedOperationException {
        return MongoloidDatabase.getInstance().getUserProvider().findUsers(fields, query);
    }

    public Collection<User> findUsers(Set<String> fields, String query, int startIndex, int numResults) throws UnsupportedOperationException {
        return MongoloidDatabase.getInstance().getUserProvider().findUsers(fields, query, startIndex, numResults);
    }

    public boolean isReadOnly() {
        return MongoloidDatabase.getInstance().getUserProvider().isReadOnly();
    }

    public boolean isNameRequired() {
        return MongoloidDatabase.getInstance().getUserProvider().isNameRequired();
    }

    public boolean isEmailRequired() {
        return MongoloidDatabase.getInstance().getUserProvider().isEmailRequired();
    }
}
