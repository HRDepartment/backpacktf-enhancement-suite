var Script = require('./script'),
    Key = require('./helpers/apikey'),
    Queue = require('./helpers/queue');

var queue, key;

// Reference: https://lab.xpaw.me/steam_api_documentation.html

function Icall(meta, callback, args) {
    var cat = meta.cat[0] !== 'I' ? 'I' + meta.cat : meta.cat,
        version = (typeof meta.version === 'string' ? meta.version : 'v000' + meta.version),
        url = "http://api.steampowered.com/api/" + cat + "/" + meta.method + "/" + version + "/?key=" + key.key + "&format=json&",
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
            // Note: Publisher-only mention this error too, be sure not to use them.
            if (/<pre>key=<\/pre>/.test(resp)) {
                meta._fail = true;
                q(meta, callback, args);
                key.remove();
                key.load();
            }
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
    key.register = function () {
        Script.GET("http://steamcommunity.com/dev/apikey", function (body) {
            var sessid = body.match(/<input type="hidden" name="sessionid" value="([a-f\d]{24})">/);
            if (!sessid) return; // Not signed into Steam

            Script.POST(
                "http://steamcommunity.com/dev/registerkey",
                function (body) {
                    key.set(key.extract(body));
                },
                {data: "domain=github.com%2Fcaresx%2Fbackpacktf-enhancement-suite&agreeToTerms=agreed&sessionid=" + sessid}
            );
        });
    }.bind(key);

    key.load();
};

exports.available = function () {
    return !!key.key;
};

exports.interface = exports.I = exports.call = q;
