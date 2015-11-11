var counter = 0;

/* jshint -W061 */
exports.exec = function (code) { return window.eval(code); };

exports.xhr = GM_xmlhttpRequest;
exports.VERB = function (url, load, args, method) {
    args.method = method;
    args.url = url;
    args.onload = function (resp) {
        load(resp.responseText);
    };
    exports.xhr(args);
};

exports.GET = function (url, load, args) { exports.VERB(url, load, args || {}, "GET"); };
exports.POST = function (url, load, args) { exports.VERB(url, load, args || {}, "POST"); };

exports.uniq = function () { return counter++; };
