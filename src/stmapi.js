var Script = require('./script'),
    Key = require('./helpers/apikey'),
    Queue = require('./helpers/queue');

var queue, key;

function Icall(meta, callback, args) {
    var cat = meta.cat[0] !== 'I' ? 'I' + meta.cat : meta.cat,
        version = (typeof meta.version === 'string' ? meta.version : 'v000' + meta.version),
        url = "http://api.steampowered.com/api/" + cat + "/" + meta.method + "/" + version + "/?key=" + key.key + "&",
        i;

    args = args || {};

    for (i in args) {
        url += i + "=" + (Array.isArray(args[i]) ? args[i].join(",") : args[i]) + "&";
    }

    Script[meta.verb || "GET"](url, function (resp) {
        var success = false,
            json;

        try {
            json = JSON.parse(resp);
        } catch (ex) {}

        if (json && json.result) {
            success = json.result.status === 1;
        }

        if (!success) {
            if (meta._fail) return;
            // TODO: Write error handling code
            return;
        }

        callback(json.result);
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

    key = new Key("steamapikey", {url: "http://steamcommunity.com/dev/apikey"}, queue.next.bind(queue));

    key.extract = function (body) {
        return (body.match(/Key: ([ABCDEF0-9]{32})/) || [])[1];
    };
    // TODO: implement .register

    key.obtain();
};

exports.interface = exports.I = exports.call = q;
