import com.thoughtworks.xstream.annotations.XStreamAlias;

@XStreamAlias("appointment")
public class Appointment {
    private long timestamp;
    private User user;

    public Appointment(long timestamp, User user) {
        this.timestamp = timestamp;
        this.user = user;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public User getUser() {
        return user;
    }

    public String toString() {
        return "Appointment(timestamp='" + timestamp + "',user='" + user + "')";
    }
}

