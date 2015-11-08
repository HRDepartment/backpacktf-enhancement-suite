exports.exec = function (code) {
    var scr = document.createElement('script'),
        elem = (document.body || document.head || document.documentElement);
    scr.textContent = code;

    elem.appendChild(scr);
    elem.removeChild(scr);
};

exports.xhr = GM_xmlhttpRequest;
exports.VERB = function (url, load, args, method) {
    args.method = method;
    args.url = url;
    args.onload = function (resp) {
        load(resp.responseText);
    };
    exports.xhr(args);
};

exports.GET = function (url, load, args) { exports.VERB(url, load, args, "GET"); };
exports.POST = function (url, load, args) { exports.VERB(url, load, args, "POST"); };
