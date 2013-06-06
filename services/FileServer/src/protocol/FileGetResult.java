package protocol;

import java.io.Serializable;

public class FileGetResult implements Serializable {
    public final static long serialVersionUID = 1l;
    public String filename;
    public byte fileData[];

    public FileGetResult(String filename, byte fileData[]) {
        this.filename = filename;
        this.fileData = fileData;
    }
}
