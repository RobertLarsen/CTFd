package server;

public interface FileClientListener {
    public void connectionClosed(FileClient target);
    public void objectReceived(FileClient target, Object o);
}

