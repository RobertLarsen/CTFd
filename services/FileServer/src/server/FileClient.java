package server;

import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.InetSocketAddress;
import java.io.IOException;
import java.io.InputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

public class FileClient implements Runnable {
    private Socket socket;
    private String peerAddress;
    private boolean running;
    private ObjectOutputStream out;
    private ObjectInputStream in;
    private FileClientListener listener;

    public FileClient(Socket s, FileClientListener listener) throws IOException {
        this.socket = s;
        this.listener = listener;
        in = new ObjectInputStream(socket.getInputStream());
        this.peerAddress = ((InetSocketAddress)s.getRemoteSocketAddress()).getAddress().getHostAddress();
        out = new ObjectOutputStream(s.getOutputStream());
        running = false;
    }

    public String getPeerAddress() {
        return peerAddress;
    }

    public void write(Object o) throws IOException {
        out.writeObject(o);
    }

    public void run() {
        running = true;
        try {
            while (running) {
                try {
                    Object o = in.readObject();
                    listener.objectReceived(this, o);
                } catch (SocketTimeoutException ste) {
                } catch (ClassNotFoundException cnfe) {
                    running = false;
                }
            }
            socket.close();
        } catch (IOException ioe) {
        }
        listener.connectionClosed(this);
    }
}
