#!/usr/bin/python

import sys
import socket
import md5
import random

SEPARATOR = '-------------------\n'

class Bashtard:
    def __init__(self, host, port):
        self.con = socket.create_connection((host, port))
        self._waitFor('What is your name? ')
    
    def _waitFor(self, good, bad = None):
        buf = ''
        while (not good in buf) and (bad is None or not bad in buf):
            d = self.con.recv(1)
            if d is None or len(d) == 0:
                return None
            buf += d
        if not bad is None and bad in buf:
            raise Exception()

        return buf

    def _waitForOptions(self):
        self._waitFor('What do you want to do? ')

    def createUser(self, username, password):
        try:
            self.con.send('%s\n' % username)
            self._waitFor('What will be your password? ', 'What is your password? ')
            self.con.send('%s\n' % password)
            self._waitFor('Hope you will find this service useful.\n')
            return True
        except Exception as e:
            return False

    def authenticate(self, username, password):
        try:
            self.con.send('%s\n' % username)
            self._waitFor('What is your password? ', 'What will be your password? ')
            self.con.send('%s\n' % password)
            self._waitFor('That was right.\n', 'Bad password\n')
            return True
        except:
            return False

    def sendMail(self, receiver, message):
        self._waitForOptions()
        try:
            self.con.send('write\n')
            self._waitFor('Who do you want to write to? ')
            self.con.send('%s\n' % receiver)
            self._waitFor('What do you want to say to %s? ' % receiver)
            self.con.send('%s\n' % message)
            self._waitFor('Thanks!\n')
            return True
        except Exception as e:
            return False

    def readFile(self, f):
        self._waitForOptions()
        try:
            self.con.send('read\n')
            self._waitFor('files do you want to read? ')
            self.con.send('%s\n' % f)
            c = self._waitFor(SEPARATOR)
            c = c[0:-len(SEPARATOR)]
            return c.strip()
        except Exception as e:
            return False

    def listUsers(self):
        self._waitForOptions()
        try:
            self.con.send('list_users\n')
            return self._waitFor(SEPARATOR).split('\n')[:-2]
        except Exception as e:
            print e
            return False

    def listFiles(self):
        self._waitForOptions()
        try:
            self.con.send('list_files\n')
            return self._waitFor(SEPARATOR).split('\n')[:-2]
        except:
            pass
        return False

def md5sum(data):
    m = md5.new()
    m.update(data)
    return m.hexdigest()

def friend(name):
    digest = md5sum(name)
    return (digest[0:len(digest) / 2], digest[len(digest) / 2:])

def plant(host, port, username, password):
    try:
        b = Bashtard(host, port)
        fb = Bashtard(host, port)
        f = friend(username)

        if b.createUser(username, password):
            if fb.createUser(f[0], f[1]):
                return 0
            else:
                print 'Could not create user'
        else:
            print 'Could not create user'
    except Exception as e:
        print 'Could not connect.'
        print e
    return 1

def check(host, port, username, password):
    try:
        b = Bashtard(host, port)
        fb = Bashtard(host, port)
        f = friend(username)
        if b.authenticate(username, password):
            if fb.authenticate(f[0], f[1]):
                if f[0] in b.listUsers():
                    if username in fb.listUsers():
                        m1 = randomMessage(25)
                        if b.sendMail(f[0], m1):
                            m2 = randomMessage(25)
                            if fb.sendMail(username, m2):
                                bf = b.listFiles()
                                if bf and len(bf) > 0:
                                    fl = bf[-1]
                                    if b.readFile(fl) == m2:
                                        bf = fb.listFiles()
                                        if bf and len(bf) > 0:
                                            fl = bf[-1]
                                            if fb.readFile(fl) == m1:
                                                return 0
                                            else:
                                                print 'New mail not in inbox'
                                        else:
                                            print 'Empty inbox'
                                    else:
                                        print 'New mail not in inbox'
                                else:
                                    print 'Empty inbox'
                            else:
                                print 'Could not send mail'
                        else:
                            print 'Could not send mail'
                    else:
                        print '%s not in userlist' % username
                else:
                    print '%s not in userlist' % f[0]
            else:
                print 'Could not authenticate'
        else:
            print 'Could not authenticate'
    except Exception as e:
        print 'Could not connect.'
        print e
    return 1

def randomMessage(l):
    alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    msg = ''
    while len(msg) < l:
        msg += random.choice(alphabet)
    return msg

def main(argv):
    res = 0
    if len(argv) < 6:
        print 'Usage: %s (-p|-c) <host> <port> <user> <pass>' % argv[0]
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
