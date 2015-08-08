var Prefs = require('./preferences'),
    API = require('./api'),
    ec, cur;

exports.shared = function (cb) {
    if (ec) {
        return cb(ec, cur);
    }

    exports.ec(function (e, c) {
        ec = e;
        cur = c;

        cb(e);
    });
};

exports.ec = function (cb) {
    function inst(currencies) {
        var e = new EconCC(currencies);
        e.step = Prefs.pref('pricing', 'step');
        e.range = Prefs.pref('pricing', 'range');
        delete e.currencies.earbuds;
        return e;
    }

    if (cur) {
        return cb(inst(cur));
    }

    API.IGetCurrencies(function (currencies) {
        if (!cur) {
            cur = currencies;
        }

        cb(inst(currencies));
    });
};

exports.default = function () {
    return Prefs.pref('pricing', 'step') === EconCC.Disabled && Prefs.pref('pricing', 'range') === EconCC.Range.Mid;
};

exports.fromListing = function (ec, price) {
    var parts = price.split(', '),
        bc = 0,
        hv = 0,
        mainc;

    parts.forEach(function (part) {
        var p = part.split(' '),
            price = +p[0],
            currency = p[1],
            v = ec.convertToBC(price, currency);

        if (v > hv) {
            hv = v;
            mainc = currency;
        }

        bc += v;
    });

    return {value: bc, currency: mainc};
};

exports.fromBackpack = function (ec, price) {
    var val = ec.parse(price);
    return {value: ec.convertToBC(val), currency: val.currency};
};
