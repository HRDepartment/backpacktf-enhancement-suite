// http://api.fixer.io/latest?base=USD&symbols=EUR,RUB,GBP
var Cache = require('../cache');

var ccCache, inst;

var ccFormats = {
	"USD": {sym: "$", thousand: ",", decimal: "."},
	"EUR": {sym: "€", thousand: " ", decimal: ","},
	"RUB": {sym: " pуб.", thousand: "", decimal: ","},
	"GBP": {sym: "£", thousand: ",", decimal: "."},
};

function symToAlpha(sym) {
    var c, format;
    for (c in ccFormats) {
        format = ccFormats[c];
        if (format.sym === sym) return c;
    }
}

function extractSymbol(str) {
	var match = str.match(/(?:\$|€|£| pуб\.)/);
	return match ? match[0] : "";
}

function CC(rates) {
    this.base = rates.base;
    this.rates = rates.rates;

    this.rates[this.base] = 1;
}

CC.prototype.convert = function (val, f, t) {
    if (!this.rates.hasOwnProperty(f) ||
        !this.rates.hasOwnProperty(t)) return -1;
    if (f === t) return val;

    if (this.base !== f) val *= this.rates[f];
    return val * this.rates[t];
};

CC.prototype.convertFromBase = function (val, t) { return this.convert(val, this.base, t); };
CC.prototype.convertToBase = function (val, f) { return this.convert(val, f, this.base); };
CC.prototype.parse = function (str) {
	var sym = extractSymbol(str),
        alpha = symToAlpha(sym),
        format = ccFormats[alpha] || {},
        val = parseFloat(str.replace(new RegExp(format.thousand, "g"), '').replace(format.decimal, '.').replace(/[^\d|\.]+/g, '').trim());

	return {val: val, sym: sym, alpha: alpha, matched: sym !== ''};
};

function update(then) {
    GM_xmlhttpRequest({
        method: "GET",
        url: "http://api.fixer.io/latest?base=USD&symbols=EUR,RUB,GBP",
        onload: function (resp) {
            var json;

            try {
                json = JSON.parse(resp.responseText);
            } catch (ex) {
                return;
            }

            ccCache.set("rates", json).save();
            then(inst = new CC(json));
        }
    });
}

exports.init = function (then) {
    ccCache = new Cache("bes-cache-cc", 24 * 60 * 60 * 1000);
    var val = ccCache.get("rates"); // 1d

    if (inst) return then(inst);
    if (val.update) {
        update(then);
    } else {
        then(inst = new CC(val.value));
    }
};
