var server = require('net').createServer(),
    ctfd = require('CTFd'),
    flagReceiver = new ctfd.FlagReceiver(server);

server.listen(6000);

flagReceiver.on('connection', function(con) {
    con.on('team', function(team) {
        console.log("Team: '" + team + "'");
    });
    con.on('flag', function(flag) {
        console.log("Flag: '" + flag + "'");
    });
    con.on('close', function() {
        console.log("Bye bye");
    });
});
