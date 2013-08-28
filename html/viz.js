$(function() {
    var TeamViz = function(name, services) {
        this.name = name;
        this.services = services;
        this.radius = 30;
        this.fontSize = 20;
        this.serviceRadius = 5;
        this.position = {
            x : 0,
            y : 0
        };
    };

    TeamViz.prototype.setFontSize = function(size) {
        this.fontSize = size;
        return this;
    };

    TeamViz.prototype.setServiceRadius = function(radius) {
        this.serviceRadius = radius;
        return this;
    };

    TeamViz.prototype.setPosition = function(x, y) {
        this.position.x = x;
        this.position.y = y;
        return this;
    };

    TeamViz.prototype.setRadius = function(radius) {
        this.radius = radius;
        return this;
    };

    TeamViz.prototype.draw = function(ctx) {
        ctx.translate(this.position.x, this.position.y);

        //Draw circle
        ctx.fillStyle = 'green';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#030';

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.stroke();

        //Draw name
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = this.fontSize + 'pt Calibri';
        ctx.fillText(this.name, 0, -this.radius - 2);

        //Draw services
    };

    var ScoreServerViz = function() {
        this.radius = 10;
        this.position = {
            x : 0,
            y : 0
        };
    };

    ScoreServerViz.prototype.setPosition = function(x, y) {
        this.position.x = x;
        this.position.y = y;
        return this;
    };

    ScoreServerViz.prototype.setRadius = function(radius) {
        this.radius = radius;
        return this;
    };


    ScoreServerViz.prototype.draw = function(ctx) {
        var fontSize = 20;

        ctx.fillStyle = 'blue';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#003';

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = fontSize + 'pt Calibri';
        ctx.fillText('Score Server', this.position.x, this.position.y + this.radius + fontSize);
    };

    var Vizualizer = function(canvas) {
        this.canvas = canvas;
        this.radius = 200;
        this.teams = [];
        this.scoreServer = new ScoreServerViz().setRadius(30).setPosition(canvas.width/2, canvas.height - 100);

        this.drawables = [];
        this.drawables.push(this.scoreServer);
    };

    Vizualizer.prototype.setRadius = function(radius) {
        this.radius = radius;
        return this;
    };

    Vizualizer.prototype.alignTeams = function() {
        var d = Math.PI / 180 * 5,
            totalAngle = Math.PI - 2 * d,
            r = this.radius,
            x = this.scoreServer.position.x,
            y = this.scoreServer.position.y,
            i, t, a;

        for (i = 0; i < this.teams.length; i++) {
            a = Math.PI + d + (totalAngle / (this.teams.length - 1) * i);
            t = this.teams[i];
            t.setPosition(x + r * Math.cos(a),
                          y + r * Math.sin(a));
        }

        return this;
    };

    Vizualizer.prototype.addTeam = function(team) {
        this.teams.push(team);
        this.drawables.push(team);
    };

    Vizualizer.prototype.repaint = function() {
        var ctx = this.canvas.getContext('2d'),
            w = this.canvas.width,
            h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        _.forEach(this.drawables, function(drawable) {
            ctx.save();
            drawable.draw(ctx);
            ctx.restore();
        });
    };

    var viz = new Vizualizer(document.getElementById('viz')),
        teams = [
            "HexOffender",
            "Ring0",
            "Darkside Inc",
            "Tykhax",
            "def4ult",
            "Pwnies",
            "Hack n Slash",
            "EuroNOP",
            "Dont Mind Us",
            "Secure Noodle Squad",
            "Majskinke"
        ],
        services = [
            "HighLow",
            "Phasebook",
            "SecretService",
            "YellowPages",
            "RockPaperScissorLizardSpock",
            "FileServer"
        ];


    _.forEach(teams, function(team) {
        viz.addTeam(new TeamViz(team, services)
                       .setRadius(30));
    });

    viz.setRadius(400).alignTeams().repaint();
});
