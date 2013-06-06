package server;

import protocol.*;
import java.io.*;
import java.net.*;
import java.util.HashMap;

public class FileServer implements Runnable, FileClientListener {
    private File uploadPath;
    private ServerSocket server;
    private boolean running;
    private HashMap<String,Integer> connectionsPerAddress;

    public FileServer(int port, String uploadPath) throws IOException {
        this.uploadPath = new File(uploadPath);
        if (this.uploadPath.exists() == false) {
            this.uploadPath.mkdirs();
        }
        server = new ServerSocket(port);
        server.setReuseAddress(true);
        server.setSoTimeout(1000);
        running = false;
        connectionsPerAddress = new HashMap<String,Integer>();
    }

    public void connectionClosed(FileClient target) {
        addTo(target, -1);
    }

    public void objectReceived(FileClient target, Object o) {
        if (o instanceof FilePut) {
            handleFilePut(target, (FilePut)o);
        } else if (o instanceof FileGet) {
            handleFileGet(target, (FileGet)o);
        }
    }

    private void handleFileGet(FileClient target, FileGet packet) {
        File f = new File(uploadPath, packet.filename);
        try {
            if (f.exists()) {
                byte buffer[] = new byte[(int)f.length()];
                FileInputStream in = new FileInputStream(f);
                in.read(buffer);
                in.close();
                target.write(new FileGetResult(packet.filename, buffer));
            } else {
                target.write(new FileNotFoundResult(packet.filename));
            }
        } catch (Exception e) {
        }
    }

    private void handleFilePut(FileClient target, FilePut packet) {
        File f = new File(uploadPath, packet.filename);
        try {
            FileOutputStream out = new FileOutputStream(f);
            out.write(packet.fileData);
            out.close();
        } catch (Exception e) {
        }
    }

    public void stop() {
        running = false;
    }

    private synchronized int addTo(FileClient client, int count) {
        String addr = client.getPeerAddress();
        int c = connectionsPerAddress.containsKey(addr) ? connectionsPerAddress.get(addr) : 0;
        c += count;
        connectionsPerAddress.put(addr, c);
        return c;
    }

    public void run() {
        running = true;
        while (running) {
            try {
                Socket s = server.accept();
                s.setSoTimeout(1000);
                FileClient client = new FileClient(s, this);
                if (addTo(client, 1) > 5) {
                    addTo(client, -1);
                    s.close();
                } else {
                    new Thread(client).start();
                }
            } catch (SocketTimeoutException ste) {
            } catch (IOException ioe) {
                running = false;
            }
        }
    }

    public static void main (String args[]) {
        try {
            int port = args.length > 0 ? Integer.parseInt(args[0]) : 8899;
            String uploadPath = args.length > 1 ? args[1] : "/tmp/uploads";
            new FileServer(port, uploadPath).run();
        } catch (Exception e) {
        }
        System.exit(0);
    }
}
