#!/usr/bin/python

import sys
import socket
from random import randrange

def plant(host, port, key, value):
    try:
        s = socket.create_connection((host, port))
        s.send('PUT:%s:%s\n' % (key, value))
        return 0
    except:
        pass
    print 'Could not plant flag'
    return 1


def check(host, port, user, flag):
    try:
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
        server_port = None
        while server_port is None:
            server_port = randrange(1025, 0xffff)
            try:
                server.bind(('0.0.0.0', server_port))
            except:
                server_port = None
        server.listen(1)
        cmd = socket.create_connection((host, port))
        cmd.send('GET:%s:%d\n' % (user, server_port))
        (client, addr) = server.accept()
        cmd.close()
        d = client.recv(1024)
        client.close()
        if d and len(d):
            parts = d.split(':')
            if len(parts) > 1:
                if parts[1] == flag:
                    print 'Flag is correct'
                    return 0
                else:
                    print 'Incorrect flag'
            else:
                print 'Bad data'
        else:
            print 'Did not receive data'
    except Exception as e:
        print e
        return 1
    return 1

def main(argv):
    res = 0
    if len(argv) < 6:
        print 'Usage: %s (-p|-c) <ip> <port> <key> <value>' % argv[0]
    elif not argv[1] in ('-p', '-c'):
        print 'Unknown option: %s' % argv[1]
        res = -1
    elif argv[1] == '-p':
        res = plant(argv[2],int(argv[3]),argv[4],argv[5])
    else:
        res = check(argv[2],int(argv[3]),argv[4],argv[5])
    return res

if __name__ == '__main__':
    sys.exit(main(sys.argv))
