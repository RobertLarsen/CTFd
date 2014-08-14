var IdIterator = function(alphabet) {
    this.alphabet = alphabet || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    this.indices = [];
};

IdIterator.prototype.reset = function() {
    this.indices = [];
};

IdIterator.prototype.next = function() {
    var i, carry = true;
    for (i = 0; carry && i < this.indices.length; i++) {
        this.indices[i]++;
        if (this.indices[i] === this.alphabet.length) {
            this.indices[i] = 0;
        } else {
            carry = false;
        }
    }
    if (carry) {
        this.indices.push(0);
    }
    return this.current();
};

IdIterator.prototype.current = function() {
    var str = new Array(this.indices.length),
        i;
    for (i = 0; i < str.length; i++) {
        str[str.length - i - 1] = this.alphabet[this.indices[i]];
    }
    return str.join('');
};

module.exports = IdIterator;
