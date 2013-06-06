import java.util.List;
import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamImplicit;

@XStreamAlias("appointments")
public class Appointments {
    private long beginTime;
    @XStreamImplicit(itemFieldName="appointment")
    private List<Appointment> appointments;

    public Appointments(long beginTime, List<Appointment> appointments) {
        this.beginTime = beginTime;
        this.appointments = appointments;
    }
}

