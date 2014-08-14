import org.jivesoftware.openfire.auth.AuthProvider;
import org.jivesoftware.openfire.auth.InternalUnauthenticatedException;
import org.jivesoftware.openfire.auth.ConnectionException;
import org.jivesoftware.openfire.auth.UnauthorizedException;
import org.jivesoftware.openfire.user.UserNotFoundException;

public class MongoloidAuthProvider implements AuthProvider {
    public void authenticate(String username, String password) throws UnauthorizedException, ConnectionException, InternalUnauthenticatedException {
        MongoloidDatabase.getInstance().getAuthProvider().authenticate(username, password);
    }

    public void authenticate(String username, String token, String digest) throws UnauthorizedException, ConnectionException, InternalUnauthenticatedException {
        MongoloidDatabase.getInstance().getAuthProvider().authenticate(username, token, digest);
    }

    public String getPassword(String username) throws UserNotFoundException {
        return MongoloidDatabase.getInstance().getAuthProvider().getPassword(username);
    }

    public boolean isDigestSupported() {
        return MongoloidDatabase.getInstance().getAuthProvider().isDigestSupported();
    }

    public boolean isPlainSupported() {
        return MongoloidDatabase.getInstance().getAuthProvider().isPlainSupported();
    }

    public void setPassword(String username, String password) throws UserNotFoundException {
        MongoloidDatabase.getInstance().getAuthProvider().setPassword(username, password);
    }

    public boolean supportsPasswordRetrieval() {
        return MongoloidDatabase.getInstance().getAuthProvider().supportsPasswordRetrieval();
    }
}

