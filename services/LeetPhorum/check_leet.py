#!/usr/bin/python

from urllib import urlencode
from urllib2 import urlopen, Request
from json import loads
import sys

class LeetPhorum:
    def __init__(self, url):
        f = urlopen(url)
        i = f.info()
        f.close()

        if not 'Set-Cookie' in i:
            raise Exception('Cookie is missing')
        self.url = url
        self.cookie = i['Set-Cookie'].split(';')[0]

    def create_user(self, name, password):
        r = Request('%s?action=create_user' % self.url, urlencode({'username':name, 'password':password}), {'Cookie' : self.cookie})
        f = urlopen(r)
        data = loads(f.read())
        if not data['success']:
            raise Exception(data['error'])

    def login(self, name, password):
        r = Request('%s?action=login' % self.url, urlencode({'username':name, 'password':password}), {'Cookie' : self.cookie})
        f = urlopen(r)
        data = loads(f.read())
        if not data['success']:
            raise Exception('Bad credentials')

    def get_password(self):
        r = Request('%s?action=get_password' % self.url, None, {'Cookie' : self.cookie})
        f = urlopen(r)
        data = loads(f.read())
        if not data['success']:
            raise Exception(data['error'])
        return data['password']

    def add_post(self, subject, body, parent_post = None):
        d = {
            'subject' : subject,
            'body' : body
        }
        if not parent_post is None:
            d['parent_post'] = parent_post
        r = Request('%s?action=add_post' % self.url, urlencode(d) , {'Cookie' : self.cookie})
        f = urlopen(r)
        data = loads(f.read())
        if not data['success']:
            raise Exception(data['error'])
        else:
            return data['post']

    def get_posts(self, index, count):
        r = Request('%s?action=get_posts&%s' % (self.url, urlencode({'index':index,'count':count})), None, {'Cookie' : self.cookie})
        f = urlopen(r)
        data = loads(f.read())
        if not data['success']:
            raise Exception(data['error'])
        return data['posts']

def _in_array(post, posts):
    for p in posts:
        if p['body'] == post['body'] and p['id'] == post['id'] and p['subject'] == post['subject'] and p['poster']['name'] == post['poster']['name'] and p['poster']['id'] == post['poster']['id']:
            return True
    return False

def _check(leet, name, flag):
    leet.login(name, flag)
    if not leet.get_password() == flag:
        raise Exception('Retrieved password was not what was expected.')
    post = leet.add_post('Hello from %s' % name, 'Whaaaats happening?')
    posts = leet.get_posts(0, 10)
    if not _in_array(post, posts):
        raise Exception('Newly added post is not in list of 10 latest posts')

def plant(url, name, flag):
    try:
        leet = LeetPhorum(url)
        leet.create_user(name, flag)
        _check(leet, name, flag)
    except Exception as e:
        sys.stderr.write('%s\n' % str(e))
        return 1
    return 0

def check(url, name, flag):
    try:
        leet = LeetPhorum(url)
        _check(leet, name, flag)
    except Exception as e:
        sys.stderr.write('%s\n' % str(e))
        return 1
    return 0

def main(argv):
    if len(argv) < 5:
        print 'Usage: %s --plant <url> <name> <flag>' % argv[0]
        print '       %s --check <url> <name> <flag>' % argv[0]
    elif argv[1] == '--plant':
        return plant(argv[2], argv[3], argv[4])
    elif argv[1] == '--check':
        return check(argv[2], argv[3], argv[4])
    else:
        sys.stderr.write('%s is not a supported mode\n' % argv[1])
        return 1

if __name__ == '__main__':
    sys.exit(main(sys.argv))

phorum = LeetPhorum('http://localhost/leet/')
phorum.login('blim', 'blam')
print phorum.get_posts(0, 10)
