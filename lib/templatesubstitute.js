module.exports = templateSubstitute;

function templateSubstitute(str, hash) {
    var x, regex;
    for (x in hash) {
        regex = new RegExp('%' + x + '%', 'g');
        str = str.replace(regex, hash[x]);
    }
    return str;
};
