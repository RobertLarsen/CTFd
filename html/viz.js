$(function() {
    var inherits = function(child, parent) {
        var ctor = function() { };
        ctor.prototype = parent.prototype;
        child.superClass_ = parent.prototype;
        child.prototype = new ctor();
        child.prototype.constructor = child;
    };

    var Circle = function() {
        this.radius = 5;
        this.position = {
            x : 0,
            y : 0
        };
        this.fillStyle = 'red';
        this.strokeStyle = '#300';
        this.lineWidth = 3;
    };

    Circle.prototype.setFillStyle = function(style) {
        this.fillStyle = style;
        return this;
    };

    Circle.prototype.setStrokeStyle = function(style) {
        this.strokeStyle = style;
        return this;
    };

    Circle.prototype.setLineWidth = function(width) {
        this.lineWidth = width;
        return this;
    };

    Circle.prototype.setPosition = function(x, y) {
        this.position.x = x;
        this.position.y = y;
        return this;
    };

    Circle.prototype.setRadius = function(radius) {
        this.radius = radius;
        return this;
    };

    Circle.prototype.draw = function(ctx) {
        //Draw circle
        ctx.fillStyle = this.fillStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.stroke();
    };

    var ServiceViz = function(name) {
        Circle.call(this);
        this.setFillStyle('#0f0').setStrokeStyle('#030');
        this.name = name;
    };
    inherits(ServiceViz, Circle);

    var TeamViz = function(name, services) {
        Circle.call(this);
        this.setFillStyle('#00f').setStrokeStyle('#003');
        this.name = name;
        this.services = _.map(services, function(s) {
            return new ServiceViz(s);
        });
        this.fontSize = 20;
        this.setRadius(30);
    };
    inherits(TeamViz, Circle);

    TeamViz.prototype.setFontSize = function(size) {
        this.fontSize = size;
        return this;
    };

    TeamViz.prototype.setPosition = function(x, y) {
        Circle.prototype.setPosition.call(this, x, y);
        return this.alignServices_();
    };

    TeamViz.prototype.setRadius = function(radius) {
        Circle.prototype.setRadius.call(this, radius);
        return this.alignServices_();
    };

    TeamViz.prototype.setServiceRadius = function(radius) {
        _.forEach(this.services, function(s) {
            s.setRadius(radius);
        });
        return this.alignServices_();
    };

    TeamViz.prototype.alignServices_ = function() {
        var distanceFromCenter = this.radius + this.services[0].radius + 2,
            distanceBetweenServices = this.services[0].radius * 2 + 3,
            doubleDistanceSquared = distanceFromCenter * distanceFromCenter * 2,
            angle = Math.acos((doubleDistanceSquared - (distanceBetweenServices * distanceBetweenServices)) / doubleDistanceSquared),
            totalAngle = angle * (this.services.length - 1),
            startAngle = (Math.PI - totalAngle) / 2,
            i, s;

        for (i = 0; i < this.services.length; i++) {
            s = this.services[i];
            s.setPosition(
                this.position.x + Math.cos(startAngle + i * angle) * distanceFromCenter,
                this.position.y + Math.sin(startAngle + i * angle) * distanceFromCenter
            );
        }

        return this;
    };

    TeamViz.prototype.draw = function(ctx) {
        Circle.prototype.draw.call(this, ctx);
        //Draw name
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = this.fontSize + 'pt Calibri';
        ctx.fillText(this.name, this.position.x, this.position.y - this.radius - 3);

        //Draw services
        _.forEach(this.services, function(service) {
            ctx.save();
            service.draw(ctx);
            ctx.restore();
        });
    };

    var ScoreServerViz = function() {
        Circle.call(this);
        this.setFillStyle('#0ff').setStrokeStyle('#033');
    };
    inherits(ScoreServerViz, Circle);

    ScoreServerViz.prototype.draw = function(ctx) {
        Circle.prototype.draw.call(this, ctx);
        var fontSize = 20;
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
                          y + r * Math.sin(a) - 150);
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

    viz.setRadius(450).alignTeams().repaint();
});
