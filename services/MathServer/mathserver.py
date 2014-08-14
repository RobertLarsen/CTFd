from twisted.internet.protocol import ServerFactory, Protocol
from twisted.internet import reactor
import os

credential_dir = 'credentials'

class MathProtocol(Protocol):
    loginname = None
    password = None
    authenticated = False

    def connectionMade(self):
        self.transport.write('==== Welcome to math server ====\n')
        self.transport.write('Please enter username: ')

    def dataReceived(self, data):
        data = data.strip()
        if self.authenticated:
            try:
                exec('res = %s' % data)
                self.transport.write('%s is %d\n' % (data, res))
                self.transport.write('Easy, give me another: ')
            except:
                self.transport.write('What are you trying to pull? Give me another: ')
        elif self.loginname is None:
            self.loginname = data
            self.transport.write('Now enter password: ')
        elif self.password is None:
            self.password = data
            if self.factory.validate(self.loginname, self.password):
                self.authenticated = True
                self.transport.write('Thank you. Now give me a problem: ')
            else:
                self.loginname = None
                self.password = None
                self.transport.write('Nope, that is not you.\nEnter username: ')

class MathFactory(ServerFactory):
    protocol = MathProtocol

    def validate(self, username, password):
        if '.' in username or '/' in username:
            return False
        pwfile = '%s/%s' % (credential_dir, username)
        if os.path.isfile(pwfile):
            return open(pwfile, 'r').read() == password
        else:
            open(pwfile, 'w').write(password)
            return True

if not os.path.isdir(credential_dir):
    os.mkdir(credential_dir)
reactor.listenTCP(8787, MathFactory())
reactor.run()
