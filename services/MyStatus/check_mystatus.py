#!/usr/bin/python

import urllib2
from urllib import urlencode
import sys
import json
import md5

class MyStatus:
    def __init__(self, url):
        self.url = url
        self.name = None
        self.id = None
        self.session = None

    def req(self, page, data):
        u = self.url + '?page=' + page
        if not data is None:
            data = urlencode(data)
        headers = {}
        if not self.session is None:
            headers['Cookie'] = 'PHPSESSID=' + self.session
        rsp = urllib2.urlopen(urllib2.Request(u, data, headers))
        cookies = rsp.info().getheader('Set-Cookie')
        if cookies:
            self.session = cookies.split(';')[0].split('=')[1]
        return json.loads(rsp.read())

    def _authOrCreate(self, page, name, password):
        res = self.req(page, { 'username' : name, 'password' : password })
        if res and 'result' in res and res['result']:
            self.name = name
            self.id = res['id']
            return True
        return False

    def createUser(self, name, password):
        return self._authOrCreate('UsercreationJSON', name, password)

    def authenticateUser(self, name, password):
        return self._authOrCreate('AuthenticationJSON', name, password)

    def setStatus(self, status):
        res = self.req('ChangeStatusJSON', {'status' : status})
        if res and 'result' in res and res['result']:
            return True
        return False

    def getStatuses(self, first = 0, count = 20):
        res = self.req('ListStatusesJSON&first=%d&count=%d' % (first, count), None)
        if res and 'entries' in res and 'result' in res and res['result']:
            return res['entries']
        return False

    def myLastStatus(self):
        first = 0
        while True:
            statuses = self.getStatuses(first)
            if statuses == False or len(statuses) == 0:
                return False
            first += len(statuses)
            for s in statuses:
                if 'user' in s and 'text' in s and s['user'] == self.name:
                    return s['text']
        
FIRST_STATUS = 'Just created an account'

def md5sum(data):
    m = md5.new()
    m.update(data)
    return m.hexdigest()

def calculage_digest(name, status):
    return md5sum((name + status)[-1::-1])

def verify_digest(name, status, max_attempts):
    digest = FIRST_STATUS
    while max_attempts > 0:
        if digest == status:
            return True
        digest = calculage_digest(name, digest)
        max_attempts -= 1
    return False

def plant(url, user, password):
    s = MyStatus(url)
    if s.createUser(user, password):
        if s.setStatus(FIRST_STATUS):
            return 0
        else:
            print 'Could not set status'
    else:
        print 'Could not create user'
    return 1

def check(url, user, password):
    s = MyStatus(url)
    if s.authenticateUser(user, password):
        status = s.myLastStatus()
        if status:
            if verify_digest(user, status, 100):
                if s.setStatus(calculage_digest(user, status)):
                    return 0
                else:
                    print 'Could not set status'
            else:
                print 'Last status could not be verified'
        else:
            print 'Did not find my last status'
    else:
        print 'Could not authenticate'
    return 1

def main(argv):
    res = 0
    if len(argv) < 5:
        print 'Usage: %s (-p|-c) <url> <user> <pass>' % argv[0]
    elif not argv[1] in ('-p', '-c'):
        print 'Unknown option: %s' % argv[1]
        res = -1
    elif argv[1] == '-p':
        res = plant(argv[2],argv[3],argv[4])
    else:
        res = check(argv[2],argv[3],argv[4])
    return res

if __name__ == '__main__':
    sys.exit(main(sys.argv))
