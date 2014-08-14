import com.mongodb.MongoClient;
import com.mongodb.DB;
import com.mongodb.BasicDBObject;
import com.mongodb.DBObject;
import com.mongodb.DBCollection;
import com.mongodb.DBCursor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.jivesoftware.util.JiveGlobals;
import org.xmpp.packet.JID;

import org.jivesoftware.openfire.admin.AdminProvider;
import org.xmpp.packet.JID;

import org.jivesoftware.openfire.auth.AuthProvider;
import org.jivesoftware.openfire.auth.InternalUnauthenticatedException;
import org.jivesoftware.openfire.auth.ConnectionException;
import org.jivesoftware.openfire.auth.UnauthorizedException;

import org.jivesoftware.openfire.user.UserManager;
import org.jivesoftware.openfire.user.UserProvider;
import org.jivesoftware.openfire.user.User;
import org.jivesoftware.openfire.user.UserNotFoundException;
import org.jivesoftware.openfire.user.UserAlreadyExistsException;

import java.net.UnknownHostException;
import java.util.LinkedList;
import java.util.List;
import java.util.Collection;
import java.util.Set;
import java.util.Date;
import java.util.Arrays;

public class MongoloidDatabase {
    private static MongoloidDatabase instance;
    private MongoClient client;
    private DB database;
    private DBCollection users;

    public MongoloidDatabase(String db) {
        try {
            this.client = new MongoClient();
            this.database = client.getDB(db);
            this.users = database.getCollection("users");
            if (getAdminProvider().getAdmins().size() == 0) {
                //No users...add a default admin
                getUserProvider().createUser("admin", "admin", "Administrator", "admin@admin.com");
                getAdminProvider().setAdmins(Arrays.asList(new JID("admin@" + JiveGlobals.getProperty("xmpp.domain"))));
            }
        } catch (Exception e) {
        }
    }

    public static MongoloidDatabase getInstance() {
        if (instance == null) {
            synchronized(MongoloidDatabase.class) {
                if (instance == null) {
                    instance = new MongoloidDatabase(JiveGlobals.getProperty("mongodb.database", "openfire"));
                }
            }
        }
        return instance;
    }

    public AdminProvider getAdminProvider() {
        return new AdminProviderImpl();
    }

    public AuthProvider getAuthProvider() {
        return new AuthProviderImpl();
    }

    public UserProvider getUserProvider() {
        return new UserProviderImpl();
    }

    private class AdminProviderImpl implements AdminProvider {
        public List<JID> getAdmins() {
            LinkedList<JID> list = new LinkedList<JID>();
            DBObject search = new BasicDBObject("admin", true);
            for (DBObject obj : users.find(search)) {
                list.add(new JID(obj.get("_id") + "@" + JiveGlobals.getProperty("xmpp.domain")));
            }
            return list;
        }

        public void setAdmins(List<JID> admins) {
            LinkedList<String> ids = new LinkedList<String>();
            for (JID jid : admins) {
                ids.add(jid.getNode());
            }

            //First revoke admin rights
            users.updateMulti(new BasicDBObject(), new BasicDBObject("$unset", new BasicDBObject("admin", 1)));
            //Then give rights to new list
            users.updateMulti(new BasicDBObject("_id", new BasicDBObject("$in", ids)), new BasicDBObject("$set", new BasicDBObject("admin", true)));
        }

        public boolean isReadOnly() {
            return false;
        }
    }

    private class UserProviderImpl implements UserProvider {
        public User loadUser(String username) throws UserNotFoundException {
            DBObject search = new BasicDBObject("_id", username);
            DBObject user = users.findOne(search);
            if (user == null) {
                throw new UserNotFoundException();
            }

            return getFrom(user);
        }

        public User createUser(String username, String password, String name, String email) throws UserAlreadyExistsException {
            try {
                loadUser(username);
                throw new UserAlreadyExistsException();
            } catch (UserNotFoundException e) {
                Date now = new Date();
                DBObject user = new BasicDBObject("_id", username)
                                          .append("password", password)
                                          .append("name", name)
                                          .append("email", email)
                                          .append("created", (int)now.getTime())
                                          .append("modified", (int)now.getTime());
                users.save(user);
                return new User(
                    username,
                    name,
                    email,
                    now,
                    now
                );
            }
        }

        public void deleteUser(String username) {
            users.remove(new BasicDBObject("_id", username));
        }

        public int getUserCount() {
            return users.find().count();
        }

        private User getFrom(DBObject obj) {
            User u = null;
            u = new User(
                obj.get("_id").toString(),
                obj.get("name").toString(),
                obj.get("email").toString(),
                new Date(((Number)obj.get("created")).longValue()),
                new Date(((Number)obj.get("modified")).longValue())
            );
            return u;
        }

        private Collection<User> getFrom(DBCursor cursor) {
            LinkedList<User> userList = new LinkedList<User>();
            for (DBObject user : cursor) {
                userList.add(getFrom(user));
            }
            return userList;
        }

        public Collection<User> getUsers() {
            return getFrom(users.find());
        }

        public Collection<String> getUsernames() {
            LinkedList<String> names = new LinkedList<String>();

            for (DBObject obj : users.find()) {
                names.add(obj.get("_id").toString());
            }

            return names;
        }

        public Collection<User> getUsers(int startIndex, int numResults) {
            return getFrom(users.find().skip(startIndex).limit(numResults));
        }

        public void setName(String username, String name) throws UserNotFoundException {
            loadUser(username);
            DBObject search = new BasicDBObject("_id", username),
                     update = new BasicDBObject("$set", new BasicDBObject("name", name));
            users.update(search, update);
        }

        public void setEmail(String username, String email) throws UserNotFoundException {
            loadUser(username);
            DBObject search = new BasicDBObject("_id", username),
                     update = new BasicDBObject("$set", new BasicDBObject("email", email));
            users.update(search, update);
        }

        public void setCreationDate(String username, Date creationDate) throws UserNotFoundException {
            loadUser(username);
            DBObject search = new BasicDBObject("_id", username),
                     update = new BasicDBObject("$set", new BasicDBObject("created", (int)creationDate.getTime()));
            users.update(search, update);
        }

        public void setModificationDate(String username, Date modificationDate) throws UserNotFoundException {
            loadUser(username);
            DBObject search = new BasicDBObject("_id", username),
                     update = new BasicDBObject("$set", new BasicDBObject("modified", (int)modificationDate.getTime()));
            users.update(search, update);
        }

        public Set<String> getSearchFields() throws UnsupportedOperationException {
            throw new UnsupportedOperationException();
        }

        public Collection<User> findUsers(Set<String> fields, String query) throws UnsupportedOperationException {
            throw new UnsupportedOperationException();
        }

        public Collection<User> findUsers(Set<String> fields, String query, int startIndex, int numResults) throws UnsupportedOperationException {
            throw new UnsupportedOperationException();
        }

        public boolean isReadOnly() {
            return false;
        }

        public boolean isNameRequired() {
            return true;
        }

        public boolean isEmailRequired() {
            return true;
        }
    }

    private class AuthProviderImpl implements AuthProvider {
        public void authenticate(String username, String password) throws UnauthorizedException, ConnectionException, InternalUnauthenticatedException {
            DBObject o = new BasicDBObject("_id", username)
                                   .append("password", password);
            if (users.findOne(o) == null) {
                throw new UnauthorizedException();
            }
        }

        public void authenticate(String username, String token, String digest) throws UnauthorizedException, ConnectionException, InternalUnauthenticatedException {
        }

        public String getPassword(String username) throws UserNotFoundException {

            DBObject o = new BasicDBObject("_id", username),
                     user = users.findOne(o);
            if (user == null) {
                throw new UserNotFoundException();
            }
            return user.get("password").toString();
        }

        public boolean isDigestSupported() {
            return false;
        }

        public boolean isPlainSupported() {
            return true;
        }

        public void setPassword(String username, String password) throws UserNotFoundException {
            DBObject search = new BasicDBObject("_id", username),
                     update = new BasicDBObject("password", password);
            if (users.update(search, update).getN() == 0) {
                throw new UserNotFoundException();
            }
        }

        public boolean supportsPasswordRetrieval() {
            return true;
        }
    }

    public static void main(String[] args) throws Exception {
    }
}
