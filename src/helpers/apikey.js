var DataStore = require('../datastore'),
    Script = require('../script');

function Key(field, loadconf, done) {
    this.field = field;
    this.loadconf = loadconf;
    this.done = done;
    this.key = '';

    Key.keys.push(this);
}

Key.prototype.register = function () {throw new Error('abstract method register not reimplemented');};
Key.prototype.extract = function (/*text*/) {throw new Error('abstract method extract not reimplemented');};

Key.prototype.obtain = function () {
    var self = this;
    Script[this.loadconf.method || "GET"](this.loadconf.url, function (body) {
        var key = self.extract(body);

        if (key) {
            self.set(key);
            self.ready();
        } else {
            self.register();
        }
    });
};

Key.prototype.set = function (key) {
    if (!key) return;

    this.key = key;
    DataStore.setItem(this.field, key);
};

Key.prototype.remove = function () {
    this.key = null;
    DataStore.removeItem(this.field);
};

Key.prototype.ready = function () {
    this.done();
};

Key.prototype.load = function () {
    var storedkey = DataStore.getItem(this.field);

    if (storedkey) {
        this.key = storedkey;
        this.ready();
    } else {
        this.obtain();
    }
};

Key.keys = [];
module.exports = Key;
