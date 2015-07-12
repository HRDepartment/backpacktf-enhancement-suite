var DataStore = require('./datastore');
var preferences = JSON.parse(DataStore.getItem("bes-preferences") || '{"features": {}}');

exports.dirty = false;
exports.prefs = preferences;
exports.enabled = function (feat) {
    var o = preferences.features[feat];
    return o ? o.enabled : false;
};

exports.pref = function (feat, name, value) {
    var o = preferences.features[feat];
    if (!o) o = preferences.features[feat] = {};

    if (arguments.length === 2) {
        return o[name];
    } else {
        o[name] = value;
        exports.dirty = true;
    }

    return this;
};

exports.default = function (feat, name, value) {
    var o = preferences.features[feat];

    if (!o) o = preferences.features[feat] = {};
    if (!o.hasOwnProperty(name)) {
        o[name] = value;
        exports.dirty = true;
    }

    return this;
};

exports.defaults = function (defs) {
    var feat, o, names, name, value;

    for (feat in defs) {
        names = defs[feat];
        o = preferences.features[feat];

        if (!o) o = preferences.features[feat] = {};

        for (name in names) {
            value = names[name];

            if (!o.hasOwnProperty(name)) {
                o[name] = value;
                exports.dirty = true;
            }

        }
    }

    return this;
};

exports.save = function () {
    if (!exports.dirty) return;
    DataStore.setItem("bes-preferences", JSON.stringify(preferences));
};

exports.applyPrefs = function (prefs) {
    var feat, key, o;

    for (feat in prefs) {
        o = prefs[feat];
        for (key in o) {
            exports.pref(feat, key, o[key]);
        }
    }

    exports.save();
    return this;
};
