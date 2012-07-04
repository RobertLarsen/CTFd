module.exports = Team;

function Team(name, host) {
    this.name = name;
    this.host = host;
    //Maps service names to arrays of flags
    this.flags = {};
};

Team.prototype.addFlag = function(flag) {
    if (this.flags[flag.service.name] === undefined) {
        this.flags[flag.service.name] = [];
    }
    this.flags[flag.service.name].push(flag);
};
