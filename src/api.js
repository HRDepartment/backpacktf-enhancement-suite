var Page = require('./page'),
    Cache = require('./cache');

var callbacks = [];
var queue = [], task = false;
var key = localStorage.getItem("backpackapikey");
var apicache = new Cache("bes-cache-api");

function keyFromPage(body) {
    var elem = (body.match(/<pre>[a-f\d]{24}<\/pre>/)[0]) || "",
        apikey = elem.substr(5, elem.length - 11);

    return apikey;
}

function removeKey() {
    key = null;
    localStorage.removeItem("backpackapikey");
}

function registerKey() {
    var token = Page.csrfToken();

    if (!token) return; // :(
    $.ajax({
        method: 'POST',
        url: "/api/register_do",
        data: {url: "backpack.tf", comments: "backpack.tf Enhancement Suite", "user-id": token},
        success: function (body) {
            setKey(keyFromPage(body));
        }
    });
}

function setKey(apikey) {
    if (!apikey) return;

    key = apikey;
    localStorage.setItem("backpackapikey", apikey);
    callbacks.forEach(function (callback) {
        callback();
    });
}

function loadKey() {
    $.ajax({
        method: 'GET',
        url: "/api/register",
        success: function (body) {
            var apikey = keyFromPage(body);

            if (!apikey) {
                return registerKey();
            }

            setKey(apikey);
        },
        cache: false,
        dataType: "text"
    });
}

function requestInterface() {
    queue.push(arguments);
    if (!task) processInterface();
}

function processInterface() {
    var next = queue.shift();

    if (next) callInterface.apply(null, next);
}

function callInterface(meta, callback, args) {
    var iname = meta.name[0] !== 'I' ? 'I' + meta.name : meta.name,
        version = (typeof meta.version === 'string' ? meta.version : 'v' + meta.version),
        url = "/api/" + iname + "/" + version + "/",
        data = {key: meta.key !== false ? key : null, appid: meta.appid || 440, compress: 1},
        val, signature, wait, i;

    task = true;
    args = args || {};

    for (i in args) {
        data[i] = args[i];
    }

    if (meta.cache) {
        signature = url + "--" + JSON.stringify(data);
        val = apicache.get(signature);

        if (val.value) {
            if (val.value.success) {
                callback(val.value);
                task = false;
                processInterface();
                return;
            } else {
                apicache.rm(signature).save();
            }
        }
    }

    $.ajax({
        method: 'GET',
        url: url,
        data: data,
        cache: false,
        success: function (json) {
            var success = json.response.success;

            if (!success) {
                if (meta._fail) return;
                console.error('API error :: ' + iname + ': ' + JSON.stringify(json));
                if (json.message === "API key does not exist.") {
                    removeKey();
                    whenAvailable(function () {
                        callInterface(meta, callback, args);
                    });
                    loadKey();
                } else if (/^You can only request this page every/.test(json.message)) {
                    wait = json.message.match(/\d/g)[1] * 1000;
                    setTimeout(function () {
                        whenAvailable(function () {
                            callInterface(meta, callback, args);
                        });
                    }, wait + 100 + Math.round(Math.random() * 1000)); // to be safe, protection against race conditions
                } else { // Unknown error, maybe network disconnected
                    setTimeout(function () {
                        meta._fail = true;
                        callInterface(meta, callback, args);
                    }, 1000);
                }
                return;
            }

            if (meta.cache) {
                apicache
                    .timeout(meta.cache || 1000 * 60)
                    .set(signature, json.response)
                    .save()
                ;
            }

            callback(json.response);
            task = false;
            processInterface();
        },
        dataType: "json"
    });
}

function isAvailable() { return !!key; }
function whenAvailable(callback) {
    if (exports.isAvailable()) callback();
    else callbacks.push(callback);
}

exports.init = function () {
    if (!key) {
        loadKey();
    }
};

exports.interface = exports.I = exports.call = requestInterface;

exports.whenAvailable = whenAvailable;

exports.APIKey = function () { return key; };
exports.isAvailable = isAvailable;

exports.IGetPrices = function (callback, args) {
    return requestInterface({
        name: "IGetPrices",
        version: 4,
        cache: 1000 * 60 * 30 // 30m
    }, callback, args);
};

exports.IGetCurrencies = function (callback, args) {
    return requestInterface({
        name: "IGetCurrencies",
        version: 1,
        cache: 1000 * 60 * 60 * 24 // 24h
    }, callback, args);
};

exports.IGetSpecialItems = function (callback, args) {
    return requestInterface({
        name: "IGetSpecialItems",
        version: 1,
        cache: 1000 * 60 * 60 * 24 // 24h
    }, callback, args);
};

exports.IGetUsers = function (ids, callback, args) {
    args = args || {};

    args.ids = Array.isArray(ids) ? ids.join(",") : ids;
    return requestInterface({
        name: "IGetUsers",
        version: 2
    }, callback, args);
};

exports.IGetUserListings = function (steamid, callback, args) {
    args = args || {};

    args.steamid = steamid;
    return requestInterface({
        name: "IGetUserListings",
        version: 1
    }, callback, args);
};
