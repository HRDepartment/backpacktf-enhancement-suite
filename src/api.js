var Page = require('./page'),
    Key = require('./helpers/apikey'),
    Queue = require('./helpers/queue'),
    Cache = require('./cache');

var apicache = new Cache("bes-cache-api");
var queue, key;

function Icall(meta, callback, args) {
    var iname = meta.name[0] !== 'I' ? 'I' + meta.name : meta.name,
        version = (typeof meta.version === 'string' ? meta.version : 'v' + meta.version),
        url = "/api/" + iname + "/" + version + "/",
        data = {key: key.key, appid: meta.appid || 440, compress: 1},
        val, signature, wait, i;

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
                queue.done();
                return;
            } else {
                apicache.rm(signature).save();
            }
        }
    }

    function equeue() { queue.enqueue(meta, callback, args); queue.done(); }
    $.ajax({
        method: 'GET',
        url: url,
        data: data,
        cache: false,
        dataType: 'json'
    }).then(function (json) {
        var success = json.response.success;

        if (!success) {
            if (meta._fail) return;
            console.error('API error :: ' + iname + ': ' + JSON.stringify(json));
            if (json.message === "API key does not exist." || json.message === "This API key is not valid.") {
                key.remove();
                equeue();
                key.load();
            } else if (/^You can only request this page every/.test(json.message)) {
                wait = json.message.match(/\d/g)[1] * 1000;
                setTimeout(equeue, wait + 100 + Math.round(Math.random() * 1000)); // to be safe, protection against race conditions
            } else { // Unknown error, maybe network disconnected
                setTimeout(function () {
                    meta._fail = true;
                    equeue();
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
        queue.done();
    });
}

function q() { queue.enqueue.apply(queue, arguments); }

exports.init = function () {
    queue = new Queue();
    queue.exec = Icall.bind(queue);
    queue.canProceed = function () {
        return !!key.key;
    }.bind(queue);

    key = new Key("backpackapikey", {url: 'https://backpack.tf/api/register'}, queue.next.bind(queue));
    key.extract = function (text) {
        var elem = (text.match(/<pre>[a-f\d]{24}<\/pre>/)[0]) || "",
            apikey = elem.substr(5, elem.length - 11);

        return apikey;
    }.bind(key);
    key.register = function () {
        var token = Page.csrfToken(),
            self = this;

        if (!token) return; // :(
        $.ajax({
            method: 'POST',
            url: "/api/register_do",
            data: {url: "backpack.tf", comments: "backpack.tf Enhancement Suite", "user-id": token},
            dataType: 'text'
        }).then(function (body) {
            self.set(self.extract(body));
        });
    }.bind(key);

    key.load();
};

exports.interface = exports.I = exports.call = q;
exports.IGetPrices = function (callback, args) {
    return q({
        name: "IGetPrices",
        version: 4,
        cache: 1000 * 60 * 30 // 30m
    }, callback, args);
};

exports.IGetCurrencies = function (callback, args) {
    return q({
        name: "IGetCurrencies",
        version: 1,
        cache: 1000 * 60 * 60 * 24 // 24h
    }, callback, args);
};

exports.IGetSpecialItems = function (callback, args) {
    return q({
        name: "IGetSpecialItems",
        version: 1,
        cache: 1000 * 60 * 60 * 24 // 24h
    }, callback, args);
};

exports.IGetUsers = function (ids, callback, args) {
    args = args || {};

    args.ids = Array.isArray(ids) ? ids.join(",") : ids;
    return q({
        name: "IGetUsers",
        version: 2
    }, callback, args);
};

exports.IGetUserListings = function (steamid, callback, args) {
    args = args || {};

    args.steamid = steamid;
    return q({
        name: "IGetUserListings",
        version: 2
    }, callback, args);
};
