import java.net.ServerSocket;
import java.net.Socket;
import java.io.IOException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.SocketTimeoutException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.nio.charset.Charset;
import java.util.LinkedList;
import java.util.HashMap;

public class GraphicusMaximus implements Runnable {
    public final static Charset CHARSET;
    private ServerSocket server;
    private boolean running;
    private Database database;

    static {
        CHARSET = Charset.availableCharsets().get("utf-8");
    }

    public GraphicusMaximus(int port, String dbpath, boolean debug) throws IOException, SQLException {
        database = new Database(dbpath, debug);
        server = new ServerSocket(port);
        server.setReuseAddress(true);
        server.setSoTimeout(1000);
        running = false;
    }

    public void run() {
        running = true;
        while (running) {
            try {
                Socket client = server.accept();
                new Thread(new Client(client, database)).start();
            } catch (SocketTimeoutException ste) {
                //We don't care
            } catch (IOException ioe) {
                //We care
                running = false;
            }
        }
    }

    public static void main(String[] args) throws IOException, SQLException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 9988;
        String dbpath = args.length > 1 ? args[1] : "graphicus.sqlite3";
        boolean debug = args.length > 2 ? "true".equals(args[2]) : false;
        new GraphicusMaximus(port, dbpath, debug).run();
    }

    private static class Database {
        private Connection con;
        private boolean debug;

        public Database(String url, boolean debug) throws SQLException {
            try {
                Class.forName("com.mysql.jdbc.Driver");
            } catch (Exception e) {
            }
            this.debug = debug;
            con = DriverManager.getConnection(url);
            create();
        }

        private void create() throws SQLException {
            Statement stmt = con.createStatement();
            stmt.executeUpdate("create table if not exists users(id integer primary key auto_increment, name varchar(16), password varchar(64), unique(name)) engine=MYISAM;");
            stmt.executeUpdate("create table if not exists graphs(id integer primary key auto_increment, owner integer, name varchar(64), unique(owner, name)) engine=MYISAM;");
            stmt.executeUpdate("create table if not exists nodes(id integer primary key auto_increment, graph integer, name varchar(32), display_name varchar(32), unique(graph, name)) engine=MYISAM;");
            stmt.executeUpdate("create table if not exists edges(source integer, destination integer, primary key(source, destination)) engine=MYISAM;");
        }

        private boolean executeUpdate(String sql) {
            boolean result = false;
            try {
                Statement stmt = con.createStatement();
                stmt.executeUpdate(sql);
                result = true;
            } catch (SQLException e) {
            }
            if (debug) System.out.println(sql + ": " + result);
            return result;
        }

        private int queryInteger(String sql) {
            int num = -1;
            try {
                Statement stmt = con.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                if (rs.next()) {
                    num = rs.getInt(1);
                }
            } catch (SQLException e) {
            }
            if (debug) System.out.println(sql + ": " + num);
            return num;
        }

        private String queryString(String sql) {
            String result = null;
            try {
                Statement stmt = con.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                if (rs.next()) {
                    result = rs.getString(1);
                }
            } catch (SQLException e) {
            }
            if (debug) System.out.println(sql + ": " + result);
            return result;
        }

        private String[] queryStrings(String sql) {
            LinkedList<String> results = new LinkedList<>();
            try {
                Statement stmt = con.createStatement();
                ResultSet rs = stmt.executeQuery(sql);
                while (rs.next()) {
                    results.add(rs.getString(1));
                }
            } catch (SQLException e) {
            }
            if (debug) System.out.println(sql + ": " + results);
            return results.toArray(new String[results.size()]);
        }

        public String[] getAllNodes(int graph) {
            return queryStrings("select name from nodes where graph=" + graph + ";");
        }

        public String[] getNodesMatching(String match, int graph) {
            return queryStrings("select name from nodes where graph=" + graph + " and name like '%" + match + "%';");
        }

        public String[] getConnections(int node) {
            return queryStrings("select name from nodes n, edges e where n.id=e.destination and e.source=" + node + ";");
        }

        public String getNodeDisplayName(int node) {
            return queryString("select display_name from nodes where id=" + node + ";");
        }

        public String getGraphName(int graph) {
            return queryString("select name from graphs where id=" + graph + ";");
        }

        public String[] getAllGraphs(int owner) {
            return queryStrings("select name from graphs where owner=" + owner + " order by id;");
        }

        public String[] getGraphsMatching(String match, int owner) {
            return queryStrings("select name from graphs where owner=" + owner + " and name like '%" + match + "%' order by id;");
        }

        public boolean createNode(String name, String displayName, int graph) {
            return executeUpdate("insert delayed into nodes(graph, name, display_name) values(" + graph + ",'" + name + "', '" + displayName + "');");
        }

        public boolean createGraph(String name, int owner) {
            return executeUpdate("insert delayed into graphs(owner, name) values(" + owner + ",'" + name + "');");
        }

        public int getGraphId(String name, int owner) {
            return queryInteger("select id from graphs where name='" + name + "' and owner=" + owner + ";");
        }

        public int getNodeId(String name, int graphId) {
            return queryInteger("select id from nodes where graph=" + graphId + " and name='" + name + "';");
        }

        public boolean connectNodes(int node1, int node2) {
            return executeUpdate("insert delayed into edges values(" + node1 + "," + node2 + ");");
        }

        public boolean createUser(String username, String password) {
            return executeUpdate("insert delayed into users(name, password) values('" + username + "', '" + password + "');");
        }

        public int authenticate(String username, String password) {
            return queryInteger("select id from users where name='" + username + "' and password='" + password + "';");
        }
    }

    private static class Client implements Runnable {
        private int userId;
        private int graphId;
        private Socket socket;
        private HashMap<String,Command> commands;
        private Database database;

        private static int LOOK_FOR_STR_BEGIN = 0;
        private static int LOOK_FOR_STR_END = 1;
        private static int LOOK_FOR_QUOTES = 2;

        public Client(Socket s, Database database) {
            this.socket = s;
            this.database = database;
            this.userId = -1;
            this.graphId = -1;

            commands = new HashMap<>();
            commands.put("CREATE_USER", new CreateUser());
            commands.put("AUTHENTICATE", new Authenticate());
            commands.put("CREATE_GRAPH", new CreateGraph());
            commands.put("USE_GRAPH", new UseGraph());
            commands.put("LIST_GRAPHS", new ListGraphs());
            commands.put("CREATE_NODE", new CreateNode());
            commands.put("CONNECT_NODES", new ConnectNodes());
            commands.put("LIST_NODES", new ListNodes());
            commands.put("TO_DOT", new ToDot());
            commands.put("TO_PNG", new ToPNG());
        }

        private String toDot() {
            StringBuilder b = new StringBuilder();

            String graphName = database.getGraphName(graphId);
            b.append("DIGRAPH ").append(graphName).append(" {\n");
            String nodeNames[] = database.getAllNodes(graphId);

            for (String node : nodeNames) {
                b.append("\t").append(node).append("[label=\"").append(database.getNodeDisplayName(database.getNodeId(node, graphId))).append("\"];\n");
            }

            for (String node : nodeNames) {
                for (String connection : database.getConnections(database.getNodeId(node, graphId))) {
                    b.append("\t").append(node).append("->").append(connection).append(";\n");
                }
            }

            b.append("}\n");
            return b.toString();
        }

        private static String[] parseArgs(String str) {
            LinkedList<String> args = new LinkedList<>();
            int i, begin = 0, state = LOOK_FOR_STR_BEGIN;
            for (i = 0; i < str.length(); i++) {
                char c = str.charAt(i);
                if (state == LOOK_FOR_STR_BEGIN) {
                    if (c == '"') {
                        begin = i + 1;
                        state = LOOK_FOR_QUOTES;
                    } else if (!(c == ' ' || c == '\t')) {
                        begin = i;
                        state = LOOK_FOR_STR_END;
                    }
                } else if (state == LOOK_FOR_STR_END) {
                    if (c == ' ' || c == '\t') {
                        args.add(str.substring(begin, i));
                        state = LOOK_FOR_STR_BEGIN;
                    }
                } else if (state == LOOK_FOR_QUOTES) {
                    if (c == '"') {
                        args.add(str.substring(begin, i));
                        state = LOOK_FOR_STR_BEGIN;
                    }
                }
            }
            if (state != LOOK_FOR_STR_BEGIN) {
                args.add(str.substring(begin));
            }
            return args.toArray(new String[args.size()]);
        }

        private static String parseCommand(String str) {
            if (str.length() == 0) {
                return null;
            }
            int idx = str.indexOf(' ');
            if (idx < 0) {
                return str;
            }
            return str.substring(0, idx);
        }

        private void write(String str) throws IOException {
            socket.getOutputStream().write((str + "\n").getBytes(CHARSET));
        }

        private void handle(String s) throws IOException {
            String command = parseCommand(s);
            if (command != null) {
                Command c = commands.get(command);
                if (c == null) {
                    write("Unknown command '" + command + "'");
                } else {
                    String args[] = parseArgs(s.substring(command.length()).trim());
                    c.handle(args);
                }
            }
        }

        public void run() {
            try {
                BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                String line;
                write("Welcome to Graphicus Maximus.\nThe graph drawing server.\nCreate a user or log in.\n");
                while ((line = in.readLine()) != null) {
                    handle(line.trim());
                }
            } catch (IOException ioe) {
            }

            try {
                socket.close();
            } catch (IOException ioe) {
            }
        }

        private interface Command {
            public void handle(String args[]) throws IOException;
        }


        private class ToPNG implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (graphId < 0) {
                    write("First select a graph.");
                } else if (args.length != 0) {
                    write("This command requires zero arguments.");
                } else {
                    String dot = toDot();
                    File dotFile = new File("/tmp/" + database.getGraphName(graphId) + ".dot");
                    File pngFile = new File("/tmp/" + database.getGraphName(graphId) + ".png");
                    FileOutputStream out = new FileOutputStream(dotFile);
                    out.write(dot.getBytes(CHARSET));
                    out.close();

                    try {
                        Runtime.getRuntime().exec(new String[] {
                            "dot", "-Tpng", "-o", pngFile.getAbsolutePath(), dotFile.getAbsolutePath()
                        }).waitFor();
                        byte buffer[] = new byte[(int)pngFile.length()];
                        new FileInputStream(pngFile).read(buffer);
                        socket.getOutputStream().write(buffer);
                    } catch (Exception e) {
                        write("Could not create png.");
                    }
                    dotFile.delete();
                    pngFile.delete();
                }
            }
        }

        private class ToDot implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (graphId < 0) {
                    write("First select a graph.");
                } else if (args.length != 0) {
                    write("This command requires zero arguments.");
                } else {
                    write(toDot());
                }
            }
        }

        private class ConnectNodes implements Command {
            public void handle(String args[]) throws IOException {
                int id1, id2;
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (graphId < 0) {
                    write("First select a graph.");
                } else if (args.length != 2) {
                    write("This command requires two arguments.");
                } else if ((id1 = database.getNodeId(args[0], graphId)) < 0) {
                    write("No such node: " + args[0]);
                } else if ((id2 = database.getNodeId(args[1], graphId)) < 0) {
                    write("No such node: " + args[1]);
                } else if (database.connectNodes(id1, id2)) {
                    write("Connection made.");
                } else {
                    write("Could not connect nodes. Maybe they are already connected.");
                }
            }
        }

        private class CreateNode implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (graphId < 0) {
                    write("First select a graph.");
                } else if (!(args.length == 1 || args.length == 2)) {
                    write("This command requires one or two arguments.");
                } else if (database.createNode(args[0], args.length == 1 ? args[0] : args[1], graphId)) {
                    write("Node created.");
                } else {
                    write("You don't have a graph by that name.");
                }
            }
        }

        private class ListNodes implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (graphId < 0) {
                    write("Select graph first.");
                } else if (!(args.length == 0 || args.length == 1)) {
                    write("This command requires zero or one argument.");
                } else {
                    String names[] = args.length == 0 ? database.getAllNodes(graphId) : database.getNodesMatching(args[0], graphId);
                    write("You have " + names.length + " nodes by that match:");
                    for (String s : names) {
                        write(s);
                    }
                }
            }
        }

        private class ListGraphs implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (!(args.length == 0 || args.length == 1)) {
                    write("This command requires zero or one argument.");
                } else {
                    String names[] = args.length == 0 ? database.getAllGraphs(userId) : database.getGraphsMatching(args[0], userId);
                    write("You have " + names.length + " graphs by that match:");
                    for (String s : names) {
                        write(s);
                    }
                }
            }
        }

        private class UseGraph implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (args.length != 1) {
                    write("This command requires an argument.");
                } else if ((graphId = database.getGraphId(args[0], userId)) > 0) {
                    write("Graph selected.");
                } else {
                    write("You don't have a graph by that name.");
                }
            }
        }

        private class CreateGraph implements Command {
            public void handle(String args[]) throws IOException {
                if (userId < 0) {
                    write("Authenticate first.");
                } else if (args.length != 1) {
                    write("This command requires an argument.");
                } else if (database.createGraph(args[0], userId)) {
                    write("Successfully created graph.");
                } else {
                    write("Could not create graph. Name may be in use.");
                }
            }
        }

        private class Authenticate implements Command {
            public void handle(String args[]) throws IOException {
                if (userId == -1) {
                    if (args.length == 2) {
                        if ((userId = database.authenticate(args[0], args[1])) > 0) {
                            write("You have successfully logged in.");
                        } else {
                            write("Bad credentials.");
                        }
                    } else {
                        write("This command requires two arguments.");
                    }
                } else {
                    write("You already have authenticated.");
                }
            }
        }

        private class CreateUser implements Command {
            public void handle(String args[]) throws IOException {
                if (args.length == 2) {
                    if (database.createUser(args[0], args[1])) {
                        write("User created successfully. Now log in.");
                    } else {
                        write("Could not create user. Perhaps the username is in use.");
                    }
                } else {
                    write("This command requires two arguments.");
                }
            }
        }
    }
}
