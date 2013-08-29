$(function() {
    var Vector = function(x, y) {
        if (arguments.length === 2) {
            this.x = x;
            this.y = y;
        } else if (arguments.length === 1) {
            this.x = arguments[0].x;
            this.y = arguments[0].y;
        } else {
            this.x = 0;
            this.y = 0;
        }
    };

    Vector.prototype.add = function(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    };

    Vector.prototype.subtract = function(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    };

    Vector.prototype.scale = function(factor) {
        this.x *= factor;
        this.y *= factor;
        return this;
    };

    Vector.prototype.lengthSquared = function() {
        return this.x * this.x + this.y * this.y;
    };

    Vector.prototype.length = function() {
        return Math.sqrt(this.lengthSquared());
    };

    Vector.prototype.normalize = function() {
        this.scale(1 / this.length());
        return this;
    };

    Vector.prototype.scaleToLength = function(length) {
        this.normalize().scale(length);
        return this;
    };

    var inherits = function(child, parent) {
        var ctor = function() { };
        ctor.prototype = parent.prototype;
        child.superClass_ = parent.prototype;
        child.prototype = new ctor();
        child.prototype.constructor = child;
    };

    var DrawLineBetween = function(circle1, circle2, t, ctx) {
        var vector = new Vector(circle2.position.x - circle1.position.x, circle2.position.y - circle1.position.y),
            origin = new Vector(vector).scaleToLength(circle1.radius).add(circle1.position),
            destination = new Vector(vector).scaleToLength(vector.length() - circle1.radius - circle2.radius).scale(t).add(origin);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(destination.x, destination.y);
        ctx.stroke();
    };

    var Circle = function() {
        this.radius = 5;
        this.position = new Vector(0, 0);
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
        var s = new Stats();
        s.setMode(0);
        s.domElement.style.position='absolute';
        s.domElement.style.right ='0px';
        s.domElement.style.top='0px';
        document.body.appendChild(s.domElement);

        this.stats = s;
        this.canvas = canvas;
        this.radius = 200;
        this.teams = [];
        this.scoreServer = new ScoreServerViz().setRadius(40).setPosition(canvas.width/2, canvas.height - 100);

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

    Vizualizer.prototype.start = function() {
        this.repaint();
        requestAnimationFrame(_.bind(this.start, this));
    };

    Vizualizer.prototype.repaint = function() {
        this.stats.begin();

        var ctx = this.canvas.getContext('2d'),
            w = this.canvas.width,
            h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        _.forEach(this.drawables, function(drawable) {
            ctx.save();
            drawable.draw(ctx);
            ctx.restore();
        });

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        DrawLineBetween(this.scoreServer, this.teams[0].services[0], 1, ctx);

        this.stats.end();
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

    viz.setRadius(450).alignTeams().start();
});
