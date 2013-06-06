package protocol;

import java.io.Serializable;

public class FilePut implements Serializable {
    public final static long serialVersionUID = 1l;
    public String filename;
    public byte fileData[];

    public FilePut(String filename, byte fileData[]) {
        this.filename = filename;
        this.fileData = fileData;
    }
}
