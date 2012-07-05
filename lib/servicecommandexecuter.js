module.exports = ServiceCommandExecuter;

function ServiceCommandExecuter(executer) {
    this.executer = executer;
};

ServiceCommandExecuter.prototype.plantFlag = function(flag, callback) {
    var cmd = this._templateCommand(flag.service.commands.plant_flag, flag);
    this.executer.execute(cmd, callback);
};

ServiceCommandExecuter.prototype.checkFlag = function(flag, callback) {
    var cmd = this._templateCommand(flag.service.commands.check_flag, flag);
    this.executer.execute(cmd, callback);
};

ServiceCommandExecuter.prototype._templateCommand = function(template, flag) {
    return templatesubstitute(template, {
        'SERVICE_DIRECTORY' : flag.service.directory,
        'HOST' : flag.team.host,
        'SERVICE_NAME' : flag.service.name,
        'FLAGID' : flag.name,
        'FLAG' : flag.data
    });
};
