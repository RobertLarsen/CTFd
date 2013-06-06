import java.sql.*;
import java.util.List;
import java.util.LinkedList;
import java.util.HashMap;

public class Database {
    private static Database instance = null;
    private Statement stmt;

    private Database(String host, String db, String user, String pass) throws ClassNotFoundException, SQLException {
        try {
            Class.forName("com.mysql.jdbc.Driver").newInstance();
            Connection conn = DriverManager.getConnection("jdbc:mysql://" + host + "/" + db + "?user=" + user + "&password=" + pass);
            stmt = conn.createStatement();
        } catch (InstantiationException ie) {
        } catch (IllegalAccessException iae) {
        }
    }

    public boolean userExists(String name) {
        boolean answer = false;
        try {
            ResultSet result = stmt.executeQuery("SELECT COUNT(*) AS count FROM users WHERE name='" + name + "'");
            result.next();
            answer = (result.getInt("count") > 0);

        } catch (SQLException e) {
        }
        return answer;
    }

    public User authenticate(String name, String password) {
        User u = null;
        try {
            ResultSet result = stmt.executeQuery("SELECT id FROM users WHERE name='" + name + "' AND password='" + password + "'");
            if (result.next()) {
                u = new User(result.getInt("id"), name);
            }
        } catch (SQLException e) {
        }
        return u;
    }

    public User createUser(String name, String password) {
        User u = null;
        try {
            stmt.executeUpdate("INSERT INTO users(name, password) VALUES('" + name + "','" + password +"')");
            u = authenticate(name, password);
        } catch (SQLException e) {
        }
        return u;
    }

    public Appointment createAppointment(long timestamp, User user) {
        Appointment a = null;
        try {
            stmt.executeUpdate("INSERT INTO appointments(timestamp, userid) VALUES('" + timestamp + "', '" + user.getId() + "')");
            a = new Appointment(timestamp, user);
        } catch (SQLException e) {
        }
        return a;
    }

    public List<Appointment> getAppointments(String username, String password, long beginTime) {
        List<Appointment> list = new LinkedList<Appointment>();
        try {
            HashMap<Integer,User> userCache = new HashMap<Integer,User>();
            String sql = "SELECT * FROM appointments LEFT JOIN users ON appointments.userid=users.id WHERE timestamp >= " + beginTime + " AND name='" + username + "' AND password='" + password + "' ORDER BY timestamp";
            ResultSet result = stmt.executeQuery(sql);
            while (result.next()) {
                User u = new User(result.getInt("id"), result.getString("name"));
                list.add(new Appointment(result.getLong("timestamp"), u));
            }
        } catch (SQLException e) {
        }
        return list;
    }

    public List<Appointment> getAppointments(long begintime, long endtime) {
        List<Appointment> list = new LinkedList<Appointment>();
        try {
            HashMap<Integer,User> userCache = new HashMap<Integer,User>();
            ResultSet result = stmt.executeQuery("SELECT * FROM appointments LEFT JOIN users ON appointments.userid=users.id WHERE timestamp BETWEEN " + begintime + " AND " + endtime + " ORDER BY timestamp");
            while (result.next()) {
                User u = userCache.get(result.getInt("id"));
                if (u == null) {
                    u = new User(result.getInt("id"), result.getString("name"));
                    userCache.put(u.getId(), u);
                }
                list.add(new Appointment(result.getLong("timestamp"), u));
            }
        } catch (SQLException e) {
        }
        return list;
    }

    public static Database getInstance(String host, String db, String user, String pass) {
        if (instance == null) {
            synchronized(Database.class) {
                if (instance == null) {
                    try {
                        instance = new Database(host, db, user, pass);
                    } catch (Exception e) {
                        throw new RuntimeException("Could not get database");
                    }
                }
            }
        }
        return instance;
    }

    public static Database getInstance() {
        return getInstance("localhost", "barbershop", "benjamin", "barker");
    }

    public static void main(String args[]) {
        User u = Database.getInstance().createUser("someuser", "somepass");
        Appointment a = Database.getInstance().createAppointment(1234l, u);
        System.out.println(a);
        System.out.println(Database.getInstance().getAppointments(7l, 8000l));
    }
}
