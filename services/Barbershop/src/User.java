import com.thoughtworks.xstream.annotations.XStreamAlias;

@XStreamAlias("user")
public class User {
    private int id;
    private String name;

    public User(int id, String name) {
        this.id = id;
        this.name = name;
    }

    public int getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String toString() {
        return "User(id='" + id + "',name='" + name + "')";
    }
}
