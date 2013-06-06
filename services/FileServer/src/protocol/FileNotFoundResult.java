package protocol;

import java.io.Serializable;

public class FileNotFoundResult implements Serializable {
    public final static long serialVersionUID = 1l;
    public String filename;

    public FileNotFoundResult(String filename) {
        this.filename = filename;
    }
}

