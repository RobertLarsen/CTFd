import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;

public class ListMyAppointments extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/xml");

        long timestamp = Long.parseLong(req.getParameter("time"));
        String username = req.getParameter("user");
        String password = req.getParameter("pass");

        JSONStream xstream = new JSONStream();
        resp.getWriter().write(xstream.toXML(listAppointments(username, password, timestamp)));
        resp.getWriter().close();
    }

    private static Appointments listAppointments(String username, String password, long timestamp) {
        Database db = Database.getInstance();
        Appointments a = new Appointments(timestamp, db.getAppointments(username, password, timestamp));
        return a;
    }
}

