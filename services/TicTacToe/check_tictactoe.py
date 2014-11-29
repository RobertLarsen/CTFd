#!/usr/bin/python

from socket import create_connection
import sys
from random import random, choice
from hashlib import md5

class TicTacToe:
    def _recv_until(self, good, bad = 'this should never happen'):
        #print 'recv_until \'%s\'' % good
        data = ''
        while not (good in data or bad in data):
            d = self.connection.recv(1)
            if d and len(d) == 1:
                #sys.stdout.write(d)
                data += d
            else:
                return False
        return good in data

    def remove(self, x, y):
        if self._recv_until('%s, make your move\n' % self.name):
            self.connection.send('remove %d %d\n' % (x, y))
            return self._recv_until('%s removed %d,%d\n' % (self.name, x, y))

    def place(self, x, y, winning = False):
        if self._recv_until('%s, make your move\n' % self.name):
            self.connection.send('place %d %d\n' % (x, y))
            if winning:
                return self._recv_until('has won the game\n')
            else:
                return self._recv_until('%s placed %d,%d\n' % (self.name, x, y))

    def create(self, name, password):
        self.connection.send('create_user "%s" "%s"\n' % (name, password))
        return self._recv_until('You have created a user. Now log in.\n', 'User creation failed: Username taken\n')

    def login(self, name, password):
        self.connection.send('login "%s" "%s"\n' % (name, password))
        self.name = name
        return self._recv_until('You have successfully authenticated.\n', 'Login failed: No such user\n')

    def was_challenged(self, opponent, challenger):
        return self._recv_until('You are now playing against %s\n' % opponent)
        
    def play(self, opponent):
        self.connection.send('play "%s"\n' % opponent)
        return self.was_challenged(opponent, self.name)

    def connect(self, host, port):
        try:
            self.connection = create_connection((host, port))
            return self._recv_until('Create a user account or log in to play a game\n')
        except:
            pass
        return False

def game1(p1, p2):
    return p1.place(2, 2) and    \
           p2.place(1, 1) and    \
           p1.place(2, 1) and    \
           p2.place(1, 2) and    \
           p1.place(2, 3, True)

def game2(p1, p2):
    return p1.place(1, 1) and    \
           p2.place(2, 1) and    \
           p1.place(2, 2) and    \
           p2.place(3, 3) and    \
           p1.place(3, 2) and    \
           p2.place(2, 3) and    \
           p1.remove(1, 1)and    \
           p1.place(1, 2, True)

games = [game1, game2]

def play_game(p1, p2):
    if p1.play(p2.name):
        if p2.was_challenged(p1.name, p1.name):
            if choice(games)(p1, p2):
                return 0
            else:
                print 'Game went bad'
        else:
            print 'Was not challenged'
    else:
        print 'Could not challenge'
    return 1

def md5sum(s):
    h = md5()
    h.update(s)
    return h.hexdigest()

def create_name(flag):
    return md5sum('name' + flag)[:16]

def create_password(flag):
    return md5sum('password' + flag)[:16]

def plant(host, port, user, flag):
    ttt = TicTacToe()
    if ttt.connect(host, port):
        if ttt.create(user, flag):
            if ttt.login(user, flag):
                opponent = TicTacToe()
                if opponent.connect(host, port):
                    if opponent.create(create_name(flag), create_password(flag)):
                        return 0
                    else:
                        print 'Could not create opponent'
                else:
                    print 'Could not connect opponent'
            else:
                print 'Could not login'
        else:
            print 'Could not create user'
    else:
        print 'Could not connect'
    return 1

def check(host, port, user, flag):
    opponent = TicTacToe()
    o_name = create_name(flag)
    o_pass = create_password(flag)
    if opponent.connect(host, port):
        if opponent.login(o_name, o_pass):
            ttt = TicTacToe()
            if ttt.connect(host, port):
                if ttt.login(user, flag):
                    if random() < 0.5:
                        return play_game(ttt, opponent)
                    else:
                        return play_game(opponent, ttt)
                else:
                    print 'Could not login'
            else:
                print 'Could not connect'
        else:
            print 'Could not login opponent'
    else:
        print 'Could not connect opponent'
    return 1

def main(argv):
    res = 0
    if len(argv) < 6:
        print 'Usage: %s (-p|-c) <ip> <port> <user> <pass>' % argv[0]
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
