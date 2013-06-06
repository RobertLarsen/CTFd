import javax.servlet.*;
import javax.servlet.http.*;
import java.io.*;
import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.io.json.JettisonMappedXmlDriver;

public class HelloWorld extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private static int counter = 0;

    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        resp.setContentType("text/plain");

        XStream xstream = new XStream(new JettisonMappedXmlDriver());
        xstream.setMode(XStream.NO_REFERENCES);
        xstream.alias("product", Product.class);
        resp.getWriter().write(xstream.toXML(new Product("Orange", 137, 10.5)));
        resp.getWriter().close();
    }
}
