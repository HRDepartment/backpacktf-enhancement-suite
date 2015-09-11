var DataStore = require('./datastore');
var preferences = loadFromDS();

exports.dirty = false;
exports.prefs = preferences;

exports.loadFromDS = loadFromDS;
exports.saveToDS = saveToDS;
exports.enabled = enabled;
exports.pref = pref;
exports.default = def;
exports.defaults = defaults;
exports.save = save;
exports.applyPrefs = applyPrefs;

function loadFromDS() {
    return JSON.parse(DataStore.getItem("bes-preferences") || '{"features": {}}');
}

function saveToDS(o) {
    DataStore.setItem("bes-preferences", JSON.stringify(o));
    return exports;
}

function enabled(feat) {
    var o = preferences.features[feat];
    return o ? o.enabled : false;
}

function pref(feat, name, value) {
    var o = preferences.features[feat];
    if (!o) o = preferences.features[feat] = {};

    if (arguments.length === 2) {
        return o[name];
    } else {
        o[name] = value;
        exports.dirty = true;
    }

    return exports;
}

function def(feat, name, value) {
    var o = preferences.features[feat];

    if (!o) o = preferences.features[feat] = {};
    if (!o.hasOwnProperty(name)) {
        o[name] = value;
        exports.dirty = true;
    }

    return exports;
}

function defaults(defs) {
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

    return exports;
}

function save() {
    if (!exports.dirty) return;
    DataStore.setItem("bes-preferences", JSON.stringify(preferences));
}

function applyPrefs(prefs) {
    var feat, key, o;

    for (feat in prefs) {
        o = prefs[feat];
        for (key in o) {
            exports.pref(feat, key, o[key]);
        }
    }

    exports.save();
    return exports;
}
