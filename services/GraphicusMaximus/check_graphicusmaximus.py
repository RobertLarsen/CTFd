#!/usr/bin/python

from socket import create_connection
import sys
from random import random
from hashlib import md5
import re
from os import getenv
from time import time

BLUE="\033[34m"
GREEN="\033[32m"
RESET="\033[0m"

class GraphicusMaximus:
    connection = None
    buf = ''

    def _randomString(self, l):
        s = ''
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_'
        while len(s) < l:
            s += alphabet[int(random() * len(alphabet))]
        return s

    def _randomGraph(self):
        nodes = []
        for i in range(int(random() * 6) + 10):
            name = '_' + self._randomString(15)
            display = self._randomString(15)
            nodes.append((name, display, []))

        #Connect all
        for node in nodes:
            connection = node
            while connection == node:
                connection = nodes[int(random() * len(nodes))]
            node[2].append(connection)

        #Connect random
        for node in nodes:
            for i in range(int(random() * 3) + 1):
                connection = node
                while connection == node or connection in node[2]:
                    connection = nodes[int(random() * len(nodes))]
                node[2].append(connection)
        return nodes

    def writeline(self, s):
        if getenv("DEBUG") == "true":
            sys.stderr.write((BLUE + '<-  %s' + RESET + '\n') % s)
        self.connection.send('%s\n' % s)

    def readline(self):
        while not '\n' in self.buf:
            data = self.connection.recv(1024)
            if data is None or data == '':
                return None
            self.buf += data

        idx = self.buf.index('\n')
        res = self.buf[0:idx]
        self.buf = self.buf[idx + 1:]
        if getenv("DEBUG") == "true":
            sys.stderr.write((GREEN + '-> %s' + RESET + '\n') % res)
        return res

    def connect(self, host, port):
        try:
            self.connection = create_connection((host, port))
            return self.readline() == 'Welcome to Graphicus Maximus.' and self.readline() == 'The graph drawing server.' and self.readline() == 'Create a user or log in.' and self.readline() == ''
        except:
            pass
        return False

    def createUser(self, name, password):
        try:
            self.writeline('CREATE_USER %s "%s"' % (name, password))
            return self.readline() == 'User created successfully. Now log in.'
        except Exception as e:
            pass
        return False

    def useGraph(self, graph):
        try:
            self.writeline('USE_GRAPH %s' % graph)
            return self.readline() == 'Graph selected.'
        except Exception as e:
            pass
        return False

    def toDot(self):
        try:
            self.writeline('TO_DOT')

            dot = ''
            data = ''
            while not data == '}':
                data = self.readline()
                dot += data
            return dot
        except Exception as e:
            print str(e)
            pass
        return False

    def authenticate(self, name, password):
        try:
            self.writeline('AUTHENTICATE %s "%s"' % (name, password))
            return self.readline() == 'You have successfully logged in.'
        except:
            pass
        return False

    def makeGraph(self, name):
        try:
            self.writeline('CREATE_GRAPH %s' % name)
            if self.readline() == 'Successfully created graph.':
                self.writeline('USE_GRAPH %s' % name)
                if self.readline() == 'Graph selected.':
                    g = self._randomGraph()
                    #Create nodes
                    for n in g:
                        pre = time()
                        self.writeline('CREATE_NODE %s "%s"' % (n[0], n[1]))
                        if not self.readline() == 'Node created.':
                            return False
                        post = time()
                        #print 'Node creation: %f' % (post - pre)
                    #Create connections
                    for n in g:
                        for c in n[2]:
                            pre = time()
                            self.writeline('CONNECT_NODES %s %s' % (n[0], c[0]))
                            if not self.readline() == 'Connection made.':
                                return False
                            post = time()
                            #print 'Connection creation: %f' % (post - pre)
                    return True
        except:
            pass
        return False

    def listGraphs(self):
        res = []
        try:
            self.writeline('LIST_GRAPHS')
            reply = self.readline()
            m = re.match('You have (\d+) graphs by that match:', reply)
            if m:
                num = int(m.group(1))
                for i in range(num):
                    res.append(self.readline())
        except:
            pass
        return res
        
def md5sum(s):
    h = md5()
    h.update(s)
    return h.hexdigest()

def create_password(flag):
    return md5sum(flag)[:16]

def plant(host, port, user, flag):
    gm = GraphicusMaximus()
    password = create_password(user)
    if gm.connect(host, port):
        if gm.createUser(user, password):
            if gm.authenticate(user, password):
                if gm.makeGraph(flag):
                    return 0
                else:
                    print 'Could not create graph'
            else:
                print 'Could not authenticate'
        else:
            print 'Could not create user'
    else:
        print 'Could not connect'
    return 1

def check(host, port, user, flag):
    gm = GraphicusMaximus()
    password = create_password(user)
    if gm.connect(host, port):
        if gm.authenticate(user, password):
            graphs = gm.listGraphs()
            if flag in graphs:
                if gm.makeGraph(md5sum(graphs[-1])):
                    if gm.useGraph(flag):
                        dot = gm.toDot() 
                        if not dot is False:
                            return 0
                        else:
                            print 'Did not get dot'
                    else:
                        print 'Could not use flag graph'
                else:
                    print 'Could not create graph'
            else:
                print 'Flag not found'
        else:
            print 'Could not authenticate'
    else:
        print 'Could not connect'
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
