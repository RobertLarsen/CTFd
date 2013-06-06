import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;

public class WeekData extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/xml");

        long beginTimestamp = Long.parseLong(req.getParameter("begin"));
        long endTimestamp = Long.parseLong(req.getParameter("end"));

        JSONStream xstream = new JSONStream();
        resp.getWriter().write(xstream.toXML(new Appointments(beginTimestamp, Database.getInstance().getAppointments(beginTimestamp, endTimestamp))));
        resp.getWriter().close();
    }
}

