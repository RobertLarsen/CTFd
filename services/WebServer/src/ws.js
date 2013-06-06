var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    sys = require('sys'),
    query = require('querystring'),
    child_process = require('child_process');

http.createServer(function(request, response) {
    var u = url.parse(request.url);
    var uri = u.pathname;
    var file = null;
    var cgi = false;
    if (uri.match(/^\/cgi-bin\//)) {
        file = path.join(process.cwd(), uri);
        cgi = true;
    } else {
        file = path.join(process.cwd(), "/static" + uri);
    }
    fs.stat(file, function(err, stat) {
        if (err) {
            response.writeHead(404);
            response.end("404 Not found: " + uri);
        } else {
            if (stat.isDirectory()) {
                file += "/index.html";
            }
            path.exists(file, function(exists) {
                if (!exists) {
                    response.writeHead(404, {"Content-Type" : "text/plain"});
                    response.end("404 Not found: " + uri);
                } else if (cgi) {
                    var cmd = file;
                    var q = query.parse(u.query);
                    for (var i in q) {
                        if (q[i]) {
                            cmd += " \"" + i + "=" + q[i] + "\"";
                        } else {
                            cmd += " " + i;
                        }
                    }
                    sys.puts(cmd);
                    child_process.exec(cmd, function(err, stdout, stderr) {
                        if (err) {
                            response.writeHead(500);
                            response.end(stderr);
                        } else {
                            response.writeHead(200);
                            response.end(stdout);
                        }
                    });
                } else {
                    fs.readFile(file, "binary", function(err, content) {
                        if (err) {
                            response.writeHead(500);
                            response.end("Internal server error");
                        } else {
                            response.writeHead(200);
                            response.end(content, "binary");
                        }
                    });
                }
            });
        }
    });
}).listen(8080);

sys.puts("Server running");
