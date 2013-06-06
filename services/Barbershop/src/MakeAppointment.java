import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;

public class MakeAppointment extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/xml");

        long timestamp = Long.parseLong(req.getParameter("time"));
        String username = req.getParameter("user");
        String password = req.getParameter("pass");

        JSONStream xstream = new JSONStream();
        resp.getWriter().write(xstream.toXML(makeAppointment(timestamp, username, password)));
        resp.getWriter().close();
    }

    private Appointment makeAppointment(long timestamp, String username, String password) {
        Appointment app = null;
        User u = null;

        Database db = Database.getInstance();
        if (db.userExists(username)) {
            u = db.authenticate(username, password);
        } else {
            u = db.createUser(username, password);
        }

        if (u != null) {
            app = db.createAppointment(timestamp, u);
        }
        return app;
    }
}
