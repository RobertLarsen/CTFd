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

    TeamViz.prototype.getService = function(name) {
        return _.findWhere(this.services, {name:name});
    };

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

    var TimeFrame = function() {};
    TimeFrame.prototype.tick = function(time, ctx) {throw 'Not implemented';};
    TimeFrame.prototype.setBeginTime = function(beginTime) {throw 'Not implemented';};
    TimeFrame.prototype.getBeginTime = function() {throw 'Not implemented';};
    TimeFrame.prototype.getDuration  = function() {throw 'Not implemented';};

    var Duration = function(duration) {
        TimeFrame.call(this);
        this.beginTime = null;
        this.handler = null;
        this.duration = duration;
    };
    inherits(Duration, TimeFrame);

    Duration.prototype.setHandler = function(handler) {
        this.handler = handler;
    };

    Duration.prototype.tick = function(time, ctx) {
        if (this.handler !== null) {
            var t = (time - this.beginTime) / this.duration;
            if (t >= 0 && t <= 1) {
                this.handler(t, ctx);
            }
        }
    };

    Duration.prototype.setBeginTime = function(begin) {
        this.beginTime = begin;
    };

    Duration.prototype.getBeginTime = function() {
        return this.beginTime;
    };

    Duration.prototype.getDuration  = function() {
        return this.duration;
    };

    var TimeSequence = function(beginTime) {
        TimeFrame.call(this);
        this.beginTime = beginTime;
        this.frames = [];
    };
    inherits(TimeSequence, TimeFrame);

    TimeSequence.prototype.tick = function(time, ctx) {
        if (time >= this.beginTime && time <= this.beginTime + this.getDuration()) {
            _.forEach(this.frames, function(f) {
                f.tick(time, ctx);
            });
        }
    };

    TimeSequence.prototype.setBeginTime = function(begin) {
        this.beginTime = begin;
    };

    TimeSequence.prototype.addDuration = function(duration) {
        var last;
        if (this.frames.length === 0) {
            duration.setBeginTime(this.beginTime);
        } else {
            last = this.frames[this.frames.length - 1];
            duration.setBeginTime(last.getBeginTime() + last.getDuration());
        }
        this.frames.push(duration);

        return duration;
    };

    TimeSequence.prototype.getBeginTime = function() {
        return this.beginTime;
    };

    TimeSequence.prototype.getDuration = function() {
        var last = this.frames[this.frames.length - 1];

        return last.getBeginTime() + last.getDuration() - this.beginTime;
    };

    var Timeline = function() {
        this.frames = [];
        this.endTime = null;
        this.replayBeginTime = null;
        this.timeTransform = 1;
        this.endCallback = null;
    };

    Timeline.prototype.setEndCallback = function(callback) {
        this.endCallback = callback;
        return this;
    };

    Timeline.prototype.getTimeTransform = function() {
        return this.timeTransform;
    };

    Timeline.prototype.setTimeTransform = function(transform) {
        if (this.replayBeginTime !== null) {
            var now = +new Date(),
                time = (now - this.replayBeginTime) * this.timeTransform + this.getBeginTime();
            this.replayBeginTime = ((now * transform) - (now - this.replayBeginTime) * this.timeTransform) / transform;
        }
        this.timeTransform = transform;
        return this;
    };

    Timeline.prototype.addTimeFrame = function(frame) {
        this.endTime = null;
        this.frames.push(frame);
        return this;
    };

    Timeline.prototype.prepare = function() {
        this.frames.sort(function(a, b) {
            return a.getBeginTime() - b.getBeginTime();
        });
        return this;
    };

    Timeline.prototype.getBeginTime = function() {
        return this.frames[0].getBeginTime();
    };

    Timeline.prototype.getEndTime = function() {
        if (this.endTime === null) {
            var end = 0;
            _.forEach(this.frames, function(f) {
                end = Math.max(end, f.getBeginTime() + f.getDuration());
            });
            this.endTime = end;
        }
        return this.endTime;
    };

    Timeline.prototype.getDuration = function() {
        return this.getEndTime() - this.getBeginTime();
    };

    Timeline.prototype.tick = function(time, ctx) {
        if (time > this.getEndTime()) {
            if (this.endCallback !== null) {
                this.endCallback(this);
            }
            this.replayBeginTime = null;
        } else {
            _.forEach(this.frames, function(f) {
                f.tick(time, ctx);
            });
        }
    };

    Timeline.prototype.start = function() {
        this.replayBeginTime = +new Date();
        return this;
    };

    Timeline.prototype.draw = function(ctx) {
        if (this.replayBeginTime !== null) {
            var now = +new Date(),
                time = (now - this.replayBeginTime) * this.timeTransform + this.getBeginTime(),
                relativeTime = (time - this.getBeginTime()) / this.getDuration(),
                fontSize = 20,
                timeString = new Date(time).toLocaleString();

            //Draw time
            ctx.fillStyle = 'black';
            ctx.textAlign = 'right';
            ctx.font = fontSize + 'pt Calibri';
            ctx.fillText(timeString, ctx.canvas.width, fontSize);

            //Draw box representing relative time
            ctx.fillStyle = '#ff0';
            ctx.strokeStyle = '#330';
            ctx.fillRect(0, ctx.canvas.height - 30, ctx.canvas.width * relativeTime, 30);
            ctx.strokeRect(0, ctx.canvas.height - 30, ctx.canvas.width - 1, 30);
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.fillText(Math.min(100, Math.round(relativeTime * 100)) + '%', ctx.canvas.width / 2, ctx.canvas.height - fontSize / 3);
            this.tick(time, ctx);
        }
    };

    var Vizualizer = function(canvas) {
        var s = new Stats();
        s.setMode(0);
        s.domElement.style.position='absolute';
        s.domElement.style.right ='0px';
        s.domElement.style.top='0px';
        document.body.appendChild(s.domElement);

        this.again = null;
        this.stats = s;
        this.canvas = canvas;
        this.radius = 200;
        this.teams = [];
        this.timeline = null;
        this.scoreServer = new ScoreServerViz().setRadius(40).setPosition(canvas.width/2, canvas.height - 100);

        this.drawables = [];
        this.drawables.push(this.scoreServer);
    };

    Vizualizer.prototype.setTimeline = function(timeline) {
        if (this.timeline !== null) {
            this.removeDrawable(this.timeline);
            this.timeline = null;
        }
        this.timeline = timeline;
        return this.addDrawable(timeline);
    };

    Vizualizer.prototype.getTimeline = function() {
        return this.timeline;
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
        return this.addDrawable(team);
    };

    Vizualizer.prototype.removeDrawable = function(drawable) {
        var idx = this.drawables.indexOf(drawable);
        if (idx >= 0) {
            this.drawables.splice(idx, 1);
        }
    };

    Vizualizer.prototype.addDrawable = function(drawable) {
        this.drawables.push(drawable);
        return this;
    };

    Vizualizer.prototype.start = function() {
        if (this.again === null) {
            var again = this.again = _.bind(function() {
                this.repaint();
                requestAnimationFrame(again);
            }, this);
            again();
        }
        this.timeline.start();
        return this;
    };

    Vizualizer.prototype.getTeam = function(name) {
        return _.findWhere(this.teams, {name:name});
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

        this.stats.end();
    };

    var drawLine = function(circle1, circle2, scale, ctx) {
        var vector = new Vector(circle2.position.x - circle1.position.x, circle2.position.y - circle1.position.y),
            origin = new Vector(vector).scaleToLength(circle1.radius).add(circle1.position),
            destination = new Vector(vector).scaleToLength(vector.length() - circle1.radius - circle2.radius).scale(scale).add(origin);

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(destination.x, destination.y);
        ctx.stroke();
    };

    var buildTimeLine = function(events, viz) {
        var tl = new Timeline(events[0].time),
            handlers = {
                'deliver' : function(e) {
                    var ts = new TimeSequence(e.time),
                        team = viz.getTeam(e.team),
                        service = team.getService(e.service);
                    //First shoot
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = 'blue';
                        drawLine(viz.scoreServer, service, t, ctx);
                    });
                    //Then fade out
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = e.success ? 'blue' : 'red';
                        drawLine(service, viz.scoreServer, 1 - t, ctx);
                    });

                    return ts;
                },
                'capture' : function(e) {
                    var ts = new TimeSequence(e.time),
                        service = viz.getTeam(e.victim).getService(e.service),
                        team = viz.getTeam(e.team);
                    //First one second for the shot
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = 'red';
                        drawLine(team, service, t, ctx);
                    });
                    //Wait two secons
                    ts.addDuration(new Duration(4000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = 'red';
                        drawLine(team, service, 1, ctx);
                    });
                    //Then one second for retrieval
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = 'red';
                        drawLine(team, service, 1 - t, ctx);
                    });

                    return ts;
                },
                'check' : function(e) {
                    var ts = new TimeSequence(e.time),
                        service = viz.getTeam(e.team).getService(e.service);
                    //First one second for the shot
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = 'orange';
                        drawLine(viz.scoreServer, service, t, ctx);
                    });
                    //Wait
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = 'orange';
                        drawLine(viz.scoreServer, service, 1, ctx);
                    });
                    //Then one second for retrieval
                    ts.addDuration(new Duration(2000)).setHandler(function(t, ctx) {
                        ctx.strokeStyle = e.success ? 'green' : 'red';
                        drawLine(viz.scoreServer, service, 1 - t, ctx);
                    });

                    return ts;
                }
            };
        _.forEach(events, function(e) {
            var tf = handlers[e.type](e);
            if (tf) {
                tl.addTimeFrame(tf);
            }
        });
        return tl.prepare();
    };

    $.ajax('viz.json', {
        success : function(data) {
            var viz = new Vizualizer(document.getElementById('viz')).setRadius(450),
                timeline;

            _.forEach(data.teams, function(team) {
                viz.addTeam(new TeamViz(team, data.services)
                               .setRadius(30));
            });
            timeline = buildTimeLine(data.events, viz);
            viz.alignTeams();
            $(document).trigger('viz', viz);

            $('#faster').click(function() {
                var speed = timeline.getTimeTransform() + 1;
                timeline.setTimeTransform(speed);
                $('#speed_indicator').text('Speed: ' + speed + 'x');
            });

            $('#slower').click(function() {
                var speed = timeline.getTimeTransform() - 1;
                if (speed > 0) {
                    timeline.setTimeTransform(speed);
                    $('#speed_indicator').text('Speed: ' + speed + 'x');
                }
            });

            $('#start').click(function() {
                $('#demo_buttons button').attr('disabled', 'disabled');
                viz.setTimeline(timeline).start();
                $(this).text('Start over');
            });

            var demo = function(event) {
                var tl = buildTimeLine([event], viz);
                viz.setTimeline(tl).start();
            };

            $('#demo_delivery_success').click(function() {
                var team = viz.teams[0];
                demo({
                    "type": "deliver",
                    "time": 1320422938000,
                    "team": team.name,
                    "service": team.services[0].name,
                    "success": true
                });
            });

            $('#demo_delivery_failure').click(function() {
                var team = viz.teams[0];
                demo({
                    "type": "deliver",
                    "time": 1320422938000,
                    "team": team.name,
                    "service": team.services[0].name,
                    "success": false
                });
            });

            $('#demo_check_success').click(function() {
                var team = viz.teams[0];
                demo({
                    "type": "check",
                    "time": 1320423203000,
                    "team": team.name,
                    "service": team.services[0].name,
                    "success": true
                })
            });

            $('#demo_check_failure').click(function() {
                var team = viz.teams[0];
                demo({
                    "type": "check",
                    "time": 1320423203000,
                    "team": team.name,
                    "service": team.services[0].name,
                    "success": false
                })
            });

            $('#demo_capture').click(function() {
                var victim = viz.teams[0],
                    attacker = viz.teams[viz.teams.length - 1];
                demo({
                    "type": "capture",
                    "time": 1320423213000,
                    "team": attacker.name,
                    "service": victim.services[0].name,
                    "victim": victim.name
                });
            });
        }
    });
});
