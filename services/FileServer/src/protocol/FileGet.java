package protocol;

import java.io.Serializable;

public class FileGet implements Serializable {
    public final static long serialVersionUID = 1l;
    public String filename;

    public FileGet(String filename) {
        this.filename = filename;
    }
}
