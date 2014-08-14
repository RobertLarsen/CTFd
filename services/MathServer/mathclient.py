#!/usr/bin/python

import random
import socket
import sys

def generate_expression():
    def value_expression(d):
        return '%d.0' % random.randrange(-1000, 1000)
    def random_expression(d):
        if d < 15:
            return random.choice(expressions)(d + 1)
        else:
            return value_expression(d + 1)
    def paren_expression(d):
        return '(%s)' % random_expression(d + 1)
    def oper_expression(d):
        opers = ['+','-','*','/']
        return '%s %s %s' % (random_expression(d + 1), opers[random.randrange(0,len(opers))], random_expression(d + 1))

    expressions = [
        random_expression, value_expression, paren_expression, oper_expression
    ]
    
    return random_expression(1)

def sink(con, s, other = 'jkafjkjf82489'):
    data = ''
    while not (s in data or other in data):
        print '"%s" not "%s"' % (s, data)
        data += con.recv(1)
    return data

def run(host, port, name, flag):
    try:
        s = socket.create_connection((host, port))
        s.settimeout(15)
        sink(s, 'Please enter username: ')
        s.send('%s\n' % name)
        sink(s, 'enter password: ')
        s.send('%s\n' % flag)
        sink(s, 'Now give me a problem: ')
        ex = None
        while ex is None:
            ex = generate_expression()
            try:
                res = eval(ex)
            except:
                #Catches division by zero
                ex = None
        s.send('%s\n' % ex)
        d = sink(s, '\n', 'trying to pull?')
        s.close()
        expected = '%s is %d\n' % (ex, res)
        if d == expected:
            return 0
        else:
            print 'Expected "%s" but got "%s"' % (expected, d)
            return 1
    except Exception as e:
        print e
        return 1

if len(sys.argv) > 5 and (sys.argv[1] == '-p' or sys.argv[1] == '--plant'):
    sys.exit(run(sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]))
if len(sys.argv) > 5 and (sys.argv[1] == '-c' or sys.argv[1] == '--check'):
    sys.exit(run(sys.argv[2], int(sys.argv[3]), sys.argv[4], sys.argv[5]))
else:
    print 'Usage: python %s <--plant|--check> <host> <port> <name> <flag>' % sys.argv[0]
