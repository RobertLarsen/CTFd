#!/usr/bin/python

import socket
import sys
import re

def plant(host, port, name, flag):
    try:
        s = socket.create_connection((host, port))
        s.send('save %s:%s\r\n' % (name, flag))
        s.close()
        return check(host, port, name, flag)
    except:
        return 1

def check(host, port, name, flag):
    try:
        s = socket.create_connection((host, port))
        s.send('load %s\r\n' % name)
        d = ''
        while True:
            data = s.recv(1024)
            if data is None or data == '':
                break
            d += data
        s.close()
        regex = '\\(' + name + '\\s+' + flag + '\\)'
        if re.match(regex, d.strip()):
            return 0
        else:
            return 1
    except:
        return 1

if len(sys.argv) > 5 and (sys.argv[1] == '-p' or sys.argv[1] == '--plant'):
    sys.exit(plant(sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]))
if len(sys.argv) > 5 and (sys.argv[1] == '-c' or sys.argv[1] == '--check'):
    sys.exit(check(sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]))
else:
    print 'Usage: python %s <--plant|--check> <host> <port> <name> <flag>' % sys.argv[0]
