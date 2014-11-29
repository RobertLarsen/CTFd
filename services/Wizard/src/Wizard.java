package Ob;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Wizard {

    private int a = 31415;
    private Map<String, String> c;
    
    private void d(InetSocketAddress e, String f, int b) {
        Socket g = null;
        try {
            g = new Socket(e.getHostName(), b);
            PrintWriter h = new PrintWriter(g.getOutputStream(), true);
            h.write(f);
            h.flush();
        } catch (IOException ex) {
            System.out.println(ex);
        } finally {
            if (g != null) {
                try {
                    g.close();
                } catch (IOException i) {
                }
            }
        }
    }
    
    private void putData(String e, String f) {
        this.c.put(e, f);
    }
    
    private String e(String f) {
        StringBuilder g = new StringBuilder();
        Pattern h = Pattern.compile(f);
        Set<String> i = this.c.keySet();
        Iterator<String> j = i.iterator();
        while(j.hasNext()) {
            String k = j.next();
            Matcher l = h.matcher(k);
            if (l.matches()) {
                g.append(f).append(":").append(this.c.get(k));
            }
        }
        return g.toString();
    }
    
    public Wizard () {
        c = new HashMap<>();
        try {
            ServerSocket f = new ServerSocket(a);
            while(true) {
                Socket g = f.accept();
                BufferedReader h = new BufferedReader(new InputStreamReader(g.getInputStream()));
                InetSocketAddress o = (InetSocketAddress)g.getRemoteSocketAddress();
                String j = h.readLine();
                String[] k = j.split(":");
                String l = k[0];
                if (l.equals("GET") && k.length == 3) {
                    String m = k[1];
                    String n = e(m);
                    this.d(o, n, Integer.parseInt(k[2]));
                } else if (l.equals("PUT") && k.length == 3) {
                    this.putData(k[1], k[2]);
                }
                g.close();
            }
        } catch (IOException ex) {
        }
    }
    
    public static void main(String[] args) {
        new Wizard();
    }   
}
