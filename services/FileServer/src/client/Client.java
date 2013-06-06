package client;

import protocol.*;
import java.io.*;
import java.net.*;

public class Client {
    private static void put(ObjectInputStream in, ObjectOutputStream out, String file) throws IOException {
        File f = new File(file);
        if (f.exists()) {
            FileInputStream fin = new FileInputStream(f);
            byte buffer[] = new byte[(int)f.length()];
            fin.read(buffer);

            out.writeObject(new FilePut(f.getName(), buffer));
        } else {
            System.err.println("No such file: " + file);
        }
    }

    private static void get(ObjectInputStream in, ObjectOutputStream out, String file) throws IOException, ClassNotFoundException {
        File f = new File(file);
        if (f.exists() == false) {
            out.writeObject(new FileGet(file));
            Object obj = in.readObject();
            if (obj instanceof FileGetResult) {
                FileGetResult res = (FileGetResult)obj;
                FileOutputStream fout = new FileOutputStream(f);
                fout.write(res.fileData);
                fout.close();
            } else {
                System.err.println("There were no such file on the server.");
            }
        } else {
            System.err.println("A file by that name already exists locally and I will not overwrite it.");
        }
    }

    public static void main (String args[]) throws Exception {
        if (args.length != 4) {
            System.out.println("Usage: Client <host> <port> <get|put> <file>");
        } else {
            String host = args[0];
            int port = Integer.parseInt(args[1]);
            String command = args[2];
            String filename = args[3];

            try {
                Socket s = new Socket(host, port);
                ObjectOutputStream out = new ObjectOutputStream(s.getOutputStream());
                ObjectInputStream in = new ObjectInputStream(s.getInputStream());

                if (command.equals("put")) {
                    put(in, out, filename);
                } else {
                    get(in, out, filename);
                }
            } catch (IOException e) {
                System.exit(1);
            }
        }
    }
}

