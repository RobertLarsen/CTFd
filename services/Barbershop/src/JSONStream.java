import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.io.json.JettisonMappedXmlDriver;
import java.util.List;
import java.util.LinkedList;

public class JSONStream extends XStream {
    public JSONStream() {
        setMode(XStream.NO_REFERENCES);
        processAnnotations(User.class);
        processAnnotations(Appointment.class);
        processAnnotations(Appointments.class);
    }
}

