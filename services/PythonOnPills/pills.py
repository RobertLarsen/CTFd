#!/usr/bin/python

import socket
import re
import sqlite3
import os
import json
import urllib

rsp_codes = {
    200 : 'OK',
    404 : 'Not found'
}

class WebServer:
    def __init__(self, server_addr, handler):
        self.server_addr = server_addr
        self.handler = handler

    def sinkConnection(self, s, regex):
        data = ''
        while regex.search(data) is None:
            d = s.recv(1)
            if d is None or d == '':
                return False
            data += d
        return data

    def handleClient_(self, client, addr):
        try:
            data = self.sinkConnection(client, re.compile('\r\n\r\n'))
            headers = {}
            data = data.split('\r\n')
            body = None
            request = data[0].split(' ')
            for line in data[1:]:
                components = line.split(': ')
                if len(components) > 1:
                    headers[components[0]] = components[1]

            headers_lowercase = {}
            for key in headers:
                headers_lowercase[key.lower()] = key

            if 'content-length' in headers_lowercase:
                size = int(headers[headers_lowercase['content-length']])
                body = client.recv(size)
            
            req = (request[0], urllib.unquote(request[1]), body, addr, headers)
            rh = {
                'Content-Type' : 'text/html; charset=utf8',
                'Server' : 'sploit'
            }
            rsp_data, rsp_code, rsp_headers = self.handler(req)
            for key in rsp_headers:
                rh[key] = rsp_headers[key]
            rh['Content-Length'] = len(rsp_data)

            client.send('HTTP/1.1 %d %s\r\n' % (rsp_code, rsp_codes[rsp_code]))
            for key in rh:
                client.send('%s: %s\r\n' % (key, rh[key]))

            client.send('\r\n')
            client.send(rsp_data)
        except Exception as e:
            print e
        client.close()

    def run(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind(self.server_addr)
        s.listen(10)
        s.settimeout(1)
        while True:
            try:
                client, addr = s.accept()
                client.settimeout(1)
                self.handleClient_(client,addr)
            except Exception as e:
                pass

class Database:
    def __init__(self, filepath):
        initialize = (not os.path.isfile(filepath))
        self.db = sqlite3.connect(filepath)
        if initialize:
            cur = self.db.cursor()
            sql = 'CREATE TABLE pills(name text unique, choice integer)'
            self.db.execute(sql)
            self.db.commit()
            cur.close()

    def add(self, name, choice):
        try:
            if choice == 0 or choice == 1:
                cur = self.db.cursor()
                sql = 'INSERT INTO pills VALUES("%s", "%d")' % (name, choice)
                cur.execute(sql)
                self.db.commit()
                cur.close()
                return True
        except:
            pass
        return False

    def getChoice(self, name):
        try:
            cur = self.db.cursor()
            sql = 'SELECT choice FROM pills WHERE name="%s"' % name
            cur.execute(sql)
            res = cur.fetchone()
            cur.close()
            if res is None:
                return None
            else:
                return res[0]
        except:
            return False

    def countChoice(self, choice):
        try:
            cur = self.db.cursor()
            sql = 'select count(*) from pills where choice=%d' % choice
            cur.execute(sql)
            res = cur.fetchone()
            cur.close()
            return int(res[0])
        except:
            return False

    def getDistribution(self):
        return (self.countChoice(0), self.countChoice(1))

def createClientHandler(db):
    def handleClient(req):
        data = '%s not found' % req[1]
        code = 404
        types = {
            'html' : 'text/html; charset=utf8',
            'json' : 'application/json; charset=utf8',
            'js' : 'application/javascript; charset=utf8',
            'css' : 'text/css; charset=utf8',
            'default' : 'application/binary'
        }
        content_type = types['html']
        headers = {}

        if req[1] == '/distribution':
            d = db.getDistribution()
            content_type = types['json']
            data = json.dumps({"red" : d[0], "blue" : d[1]})
            code = 200
        elif req[1] == '/take':
            h = {}
            for pair in [p.split('=') for p in req[2].split('&')]:
                if len(pair) > 1:
                    h[pair[0]] = pair[1]
            if 'name' in h and 'pill' in h:
                if db.add(h['name'], int(h['pill'])):
                    data = 'Thanks'
                    code = 200
                else:
                    data = 'You already voted'
                    code = 200
            else:
                data = 'Bad request'
        elif req[1][0:4] == '/me/':
            name = req[1][4:]
            res = db.getChoice(name)
            if res is None or res is False:
                data = 'No vote'
                code = 200
            else:
                data = str(res)
                code = 200
        else:
            if req[1] == '/':
                filepath = 'www/index.html' 
            else:
                filepath = 'www/%s' % req[1][1:]
            if os.path.isfile(filepath):
                extension = filepath[filepath.rindex('.') + 1:]
                if not extension in types:
                    extension = 'default'
                content_type = types[extension]
                with open(filepath) as f:
                    data = f.read()
                code = 200


        headers['Content-Type'] = content_type
        return (data, code, headers)
    return handleClient

db = Database('pills.db')
WebServer(('0.0.0.0', 2222), createClientHandler(db)).run()
