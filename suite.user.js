/*!
// ==UserScript==
// @name         backpack.tf enhancement suite
// @namespace    http://steamcommunity.com/id/theoddball
// @author       cares with edits by The Oddball
// @version      1.6.5.1
// @description  Enhances your backpack.tf experience.
// @include      /^https?://.*\.?backpack\.tf/.*$/
// @exclude      /^https?://forums\.backpack\.tf/.*$/
// @require      https://caresx.github.io/backpacktf-enhancement-suite/deps.js
// @downloadURL  https://theoddball.github.io/oddBES/suite.user.js
// @updateURL    https://theoddball.github.io/oddBES/suite.meta.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @require      https://gist.githubusercontent.com/Fiskie/b3eb298e4af8734d63ec/raw/a89780567dcb5b3d1a60b03d90cf9b4731978a72/inventory.js
// ==/UserScript==
*/

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * backpack.tf Enhancement Suite - enhancing your backpack.tf experience
 * Made by cares <http://steamcommunity.com/id/caresx> and The Oddball <http://steamcommunity.com/id/theoddball>
 *
 * Post feedback + view instuctions:
   http://forums.backpack.tf/index.php?/topic/36130-backpacktf-enhancement-suite/
 * Browse the source code: https://github.com/caresx/backpacktf-enhancement-suite
 * Changelog:
   https://github.com/caresx/backpacktf-enhancement-suite/blob/gh-pages/CHANGELOG.md
 *
 * Edit your preferences: http://backpack.tf/my/preferences##bes
 */

var Prefs = require('./preferences'),
    Page = require('./page');

// Ignore non-html pages
if (!document.getElementById("helpers")) return;

Page.init();
require('./api').init();

Prefs.defaults({
    lotto: {show: true},
    notifications: {updatecount: 'click'},
    pricetags: {
        modmult: 0.5,
        tooltips: true
    },
    changes: {
        enabled: true,
        outdatedwarn: true,
        period: 1000 * 60 * 60 * 24 // 1d
    },
    pricing: {
        step: EconCC.Disabled,
        range: EconCC.Range.Mid
    },
    classifieds: {
        signature: '',
        'signature-buy': '',
        autoclose: true,
        autopeek: false,
        autofill: 'default'
    },
    homebg: {
        image: '',
        repeat: 'no-repeat',
        posy: 'top',
        posx: 'center',
        attachment: 'fixed',
        sizing: 'cover',
        replacewalls: true
    },
    other: {
        originalkeys: false,
        thirdpartyprices: true
    }
});

function exec(mod) {
    mod();
    mod.initialized = true;
}

exec(require('./components/improvements'));
exec(require('./components/reptf'));
exec(require('./components/quicklist')); // prefs checked inside main
exec(require('./components/pricetags'));
if (Prefs.enabled('changes')) exec(require('./components/changes'));
exec(require('./components/refresh'));
exec(require('./components/classifieds'));
exec(require('./components/prefs'));
exec(require('./components/search'));
exec(require('./components/dupes'));
exec(require('./components/users'));

require('./menu-actions').applyActions();
Page.addTooltips();

$(document).off('click.bs.button.data-api'); // Fix for bootstrap
Page.loaded = true;

},{"./api":2,"./components/changes":5,"./components/classifieds":6,"./components/dupes":7,"./components/improvements":8,"./components/prefs":9,"./components/pricetags":10,"./components/quicklist":11,"./components/refresh":12,"./components/reptf":13,"./components/search":14,"./components/users":18,"./menu-actions":22,"./page":23,"./preferences":24}],2:[function(require,module,exports){
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
        return (text.match(/<pre>([a-f\d]{24})<\/pre>/) || [])[1];
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

},{"./cache":3,"./helpers/apikey":20,"./helpers/queue":21,"./page":23}],3:[function(require,module,exports){
var DataStore = require('./datastore');
var names = [];

function Cache(name, pruneTime) {
    this.name = name;
    this.storage = JSON.parse(DataStore.getItem(name) || "{}");
    this.pruneTime = typeof pruneTime === 'number' ? pruneTime : 1000;

    names.push(name);
}

Cache.prototype.get = function (name) {
    var updated = this.prune();

    if (this.storage[name]) {
        if (updated) this.save();
        return {value: this.storage[name].json};
    }

    return {update: true};
};

Cache.prototype.set = function (name, json) {
    this.storage[name] = {time: Date.now() + this.pruneTime, json: json};
    return this;
};

Cache.prototype.rm = function (name) {
    delete this.storage[name];
    return this;
};

Cache.prototype.save = function () {
    DataStore.setItem(this.name, JSON.stringify(this.storage));
    return this;
};

Cache.prototype.timeout = function (t) {
    this.pruneTime = t;
    return this;
};

Cache.prototype.prune = function () {
    var updated = false,
        time, uid;

    if (this.pruneTime <= 0) return updated;
    for (uid in this.storage) {
        time = this.storage[uid].time;

        if (Date.now() > time) {
            updated = true;
            delete this.storage[uid];
        }
    }

    return updated;
};

module.exports = Cache;
module.exports.names = names;

},{"./datastore":19}],4:[function(require,module,exports){
// http://api.fixer.io/latest?base=USD&symbols=EUR,RUB,GBP
var Cache = require('../cache'),
    Script = require('../script');

var ccCache, inst;

var ccFormats = {
    "USD": {sym: "$", thousand: ",", decimal: "."},
    "EUR": {sym: "€", thousand: " ", decimal: ",", trail: true},
    "RUB": {sym: " pуб.", thousand: "", decimal: ",", trail: true},
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
    return (str.match(/(?:\$|€|£| pуб\.)/) || [])[0] || "";
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

    if (f !== this.base) return val * 1/this.rates[f];
    else return val * this.rates[t];
};

CC.prototype.convertFromBase = function (val, t) { return this.convert(val, this.base, t); };
CC.prototype.convertToBase = function (val, f) { return this.convert(val, f, this.base); };
CC.prototype.parse = function (str) {
    var sym = extractSymbol(str),
        alpha = symToAlpha(sym),
        format = ccFormats[alpha] || {},
        val = parseFloat(str.replace(new RegExp(format.thousand, "g"), '').replace(format.decimal, '.').replace(/[^\d|\.]+/g, '').trim());

    return {val: val, sym: sym, alpha: alpha, trailing: format.trail || false, matched: sym !== ''};
};

function update(then) {
    Script.GET("http://api.fixer.io/latest?base=USD&symbols=EUR,RUB,GBP", function (resp) {
        var json;

        try {
            json = JSON.parse(resp);
        } catch (ex) {
            return;
        }

        ccCache.set("rates", json).save();
        then(inst = new CC(json));
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

},{"../cache":3,"../script":26}],5:[function(require,module,exports){
var Prefs = require('../preferences'),
    Page = require('../page'),
    Pricing = require('../pricing'),
    API = require('../api'),
    MenuActions = require('../menu-actions');

var period = Prefs.pref('changes', 'period'), // ms
    now = moment(),
    ec;

function priceInPeriod(price) {
    var mom = moment.unix(price.last_update);
    return now.diff(mom) <= period;
}

function priceOutdated(price) {
    return now.diff(moment.unix(price.last_update), 'months', true) >= 3;
}

function applyArrows(changes) {
    var mode = EconCC.Mode.Label,
        hash, o, price, elems, od,
        value, diff, icon, html;

    function addIcon(el) { Page.addItemIcon(el, html); }
    for (hash in changes) {
        o = changes[hash];
        price = o.price;
        elems = o.elements;
        od = o.hasOwnProperty("outdated");

        html = "";

        if (o.change !== false) {
            value = {low: Math.abs(price.difference), currency: 'metal'};

            if (price.last_update === 0) {
                icon = "fa fa-certificate";
                diff = 'Newly priced';
            } else if (price.difference === 0) {
                icon = "fa fa-yellow fa-retweet";
                diff = 'Refreshed';
            } else if (price.difference > 0) {
                icon = "fa fa-green fa-arrow-up";
                diff = 'Up ' + ec.format(value, mode);
            } else if (price.difference < 0) {
                icon = "fa fa-red fa-arrow-down";
                diff = 'Down ' + ec.format(value, mode);
            }

            diff += ' ' + moment.unix(price.last_update).from(now);
            html += "<div class='arrow-icon changes-price-arrow'><i class='" + icon + " change-tooltip' title='" + diff + "'></i></div>";
        }

        if (od) {
            html += "<div class='arrow-icon'><i class='fa fa-warning fa-red od-tooltip' title='Last updated " + moment.unix(price.last_update).from(now) + "'></i></div>";
        }

        if (html.length) elems.forEach(addIcon);
    }

    Page.addTooltips($('.change-tooltip, .od-tooltip'));
}

function applyChanges(pricelist) {
    var items = $('.item:not(.spacer)'),
        warn = Prefs.pref('changes', 'outdatedwarn'),
        cache = {},
        changes = {};

    items.each(function () {
        var item = pricelist.items[this.dataset.name],
            quality = +this.dataset.quality,
            tradable = this.dataset.tradable === "1",
            craftable = this.dataset.craftable === "1",
            series = this.dataset.crate || this.dataset.priceindex,
            price, hash, od;

        if (!item) return;
        hash = this.dataset.defindex + "-" + quality + "-" + tradable + "-" + craftable + (series ? "-" + series : "");


        if (cache[hash] === true) {
            changes[hash].elements.push(this);
            return;
        } else if (cache[hash] === false) return;

        price = item.prices[quality];
        if (!price) return;
        price = price[tradable ? "Tradable" : "Non-Tradable"];
        if (!price) return;
        price = price[craftable ? "Craftable" : "Non-Craftable"];
        if (!price) return;

        if (series) {
            price = price[series];
            if (!price) return;

            od = warn && quality === 5 && priceOutdated(price);
            if (priceInPeriod(price)) {
                cache[hash] = true;
                changes[hash] = {price: price, elements: [this]};
                if (od) changes[hash].outdated = true;
            } else {
                if (od) changes[hash] = {price: price, elements: [this], change: false, outdated: true};
                cache[hash] = od;
            }
        } else {
            price = price[0];
            if (priceInPeriod(price)) {
                cache[hash] = true;
                changes[hash] = {price: price, elements: [this]};
            } else {
                cache[hash] = false;
            }
        }
    });

    applyArrows(changes);
}

function onMenuActionClick() {
    var dis = {},
        hours = period / 1000 / 60 / 60,
        ts = [],
        container = $("<div>"),
        d, clones, elems;

    elems = $('.changes-price-arrow').parent().parent().filter(function () {
        var di = this.dataset.defindex;
        if (!dis.hasOwnProperty(di)) {
            return (dis[di] = true);
        }
        return false;
    }).clone().addClass('change-clone').removeClass('unselected');

    if (hours >= 24) {
        d = Math.floor(hours / 24);
        ts.push((d === 1 ? "" : d + " ") + "day" + (d === 1 ? "" : "s"));
        hours %= 24;
    }
    if (hours) {
        ts.push((hours === 1 ? "" : hours + " ") + "hour" + (hours === 1 ? "" : "s"));
    }

    container
        .append("<p><i>Showing price changes from the past " + ts.join(" and ") + "</i></p>")
        .append($("<div id='change-cloned' class='row'/>").append(elems));

    Page.modal("Recent Price Changes", container);

    clones = $('.change-clone');
    Page.addItemPopovers(clones, $("#change-cloned"));
    Page.addTooltips(clones.find('.change-tooltip'), '#change-cloned');
}

function addMenuAction() {
    MenuActions.addAction({
        name: 'Recent Price Changes',
        icon: 'fa-calendar',
        id: 'bp-recent-changes',
        click: onMenuActionClick
    });
}

function load() {
    if (!Page.isBackpack() || Page.appid() !== 440) return;

    API.IGetPrices(function (pricelist) {
        Pricing.shared(function (inst) {
            ec = inst;
            addMenuAction();
            applyChanges(pricelist);
        });
    });
}

module.exports = load;

},{"../api":2,"../menu-actions":22,"../page":23,"../preferences":24,"../pricing":25}],6:[function(require,module,exports){
var Page = require('../page'),
    Script = require('../script'),
    Prefs = require('../preferences'),
    Pricing = require('../pricing'),
    MenuActions = require('../menu-actions'),
    Pricetags = require('./pricetags');

function addRemoveAllListings() {
    MenuActions.addAction({
        name: 'Remove Listings',
        icon: 'fa-trash-o',
        id: 'rm-classifieds-listings',
        click: function () {
            Script.exec("$('.listing-remove').click().click();"); // Double .click for confirmation
            (function refresh() {
                setTimeout(function () {
                    if (!$('.listing-remove').length) location.reload();
                    else refresh();
                }, 300);
            }());
        }
    });
}

function autofillLowest(clones, auto) {
    var metal = $("#metal"),
        keys = $("#keys"),
        lowest;

    clones.each(function () {
        var val = this.dataset.listingPrice;

        if (lowest) return;
        if (this.dataset.listingIntent !== '1' || !val) return; // sellers only
        if (auto && this.dataset.listingAutomatic !== "true") return;

        val = val.split(', ');

        if (val[0].indexOf('key') !== -1) {
            lowest = {metal: parseFloat(val[1] || 0), keys: parseInt(val[0])};
        } else {
            lowest = {metal: parseFloat(val[0]), keys: 0};
        }
    });

    if (lowest) {
        metal.val(lowest.metal);
        keys.val(lowest.keys);
        Script.window.updateFormState();
    }
}

function peekload(html) {
    $("#peek-panel").append('<div class="panel-body padded" id="peek-panel-body"></div>');
    var $ppb = $("#peek-panel-body"),
        h = $.parseHTML(html),
        buyers = [],
        sellers = [],
        autofill = Prefs.pref('classifieds', 'autofill'),
        autofillEnabled = location.href.indexOf('/sell/') !== -1 &&
            (autofill === 'lowest' || autofill === 'lowestauto'),
        clones;

    $('.item', h).each(function () {
        var $this = $(this),
            clone = this.cloneNode(true);
        clone.classList.add('classifieds-clone');
        clone.dataset.listingAutomatic = !!$this.closest('.media.listing').find('.fa-flash').length;

        if (clone.dataset.listingIntent === '0') {
            buyers.push(clone);
        } else if (clone.dataset.listingIntent === '1') {
            if (clone.dataset.listingAutomatic) {
                Page.addItemIcon($this, '<div class="arrow-icon"><i class="fa fa-bolt"></i></div>');
            }

            sellers.push(clone);
        }
    });

    if (sellers.length) {
        $ppb.append('<h5>Sellers</h5><div id="classifieds-sellers" class="row"></div>');
        $("#classifieds_sellers").html(sellers);
    }

    if (buyers.length) {
        $ppb.append('<h5>Buyers</h5><div id="classifieds-buyers" class="row"></div>');
        $("#classifieds_buyers").html(buyers);
    }

    if (!sellers.length && !buyers.length) {
        $ppb.append("<p>No buy or sell orders for this item.</p>");
    }

    clones = $('.classifieds-clone');
    if (clones.length) {
        Page.addItemPopovers(clones, $ppb);

        if (Pricetags.enabled()) {
            Pricetags.setupInst(function () {
                Pricetags.applyTagsToItems(clones);
            });
        }

        if (autofillEnabled) {
            autofillLowest(clones, autofill === 'lowestauto');
        }
    }
}

function peek(e) {
    if (e) e.preventDefault();

    $.ajax({
        method: "GET",
        url: $('.item').data('listing-url'),
        dataType: "html"
    }).done(peekload);
}

function add(sig) {
    var htm =
        '<div class="row"><div class="col-md-12 "><div class="panel panel-main" id="peek-panel">'+
        '<div class="panel-heading">Classifieds <span class="pull-right"><small><a href="#" id="classifieds-peek">Peek</a></small></span></div>'+
        '</div></div></div></div>';
    var signature = Prefs.pref('classifieds', sig),
        $details = $("#details");

    $('#page-content .row:eq(1)').before(htm);

    if (!$details.val().length) {
        $details.val(signature);
        Script.exec('$("#details").trigger("blur");');
    }

    if (Prefs.pref('classifieds', 'autopeek')) peek();
    else $("#classifieds-peek").one('click', peek);

    if (Prefs.pref('classifieds', 'autoclose')) {
        $("#classifieds-form").submit(function () {
            $.post(location.pathname, $(this).serialize()).done(function () {
                window.close();
            }).fail(function () {
                alert("Error occurred, try again later.");
                $('#button_save').prop('disabled', true).html('Create Listing');
            });
            return false;
        });
    }
}

function addAutofill() {
    var metal = $("#metal"),
        keys = $("#keys"),
        item = $('.item-singular .item'),
        val = parseFloat(item.data('price'));

    if (Prefs.pref('classifieds', 'autofill') !== 'backpack' || !val) return;
    if (metal.val().length || keys.val().length) return;

    Pricing.shared(function (ec) {
        var m = {value: val, currency: 'metal'},
            k = ec.convertToCurrency(m, 'keys');

        if (k.value >= 1) {
            m = ec.convertToCurrency({value: k.value % 1, currency: 'keys'}, 'metal');

            k.value = Math.floor(k.value);
            keys.val(parseInt(ec.formatCurrency(k), 10));
        }

        if (m.value > 0.08) {
            ec.scope({step: EconCC.Enabled, currencies: {metal: {step: 0.11}}}, function () {
                metal.val(parseFloat(ec.formatCurrency(m)));
            });
        }

        Script.window.updateFormState();
    });
}

function buy() {
    add('signature-buy');
}

function sell() {
    add('signature');
    addAutofill();
}

function global() {
    if (document.querySelector('.listing-remove')) addRemoveAllListings();
}

function load() {
    var pathname = location.pathname;

         if (/^\/classifieds\/buy\/.{1,}\/.{1,}\/.{1,}\/.{1,}\/?.*/.test(pathname)) buy();
    else if (/^\/classifieds\/relist\/.{1,}/.test(pathname)) buy();
    else if (/^\/classifieds\/sell\/.{1,}/.test(pathname)) sell();
    global();
}

module.exports = load;

},{"../menu-actions":22,"../page":23,"../preferences":24,"../pricing":25,"../script":26,"./pricetags":10}],7:[function(require,module,exports){
var Script = require('../script'),
    Page = require('../page'),
    MenuActions = require('../menu-actions');

// Injected into the page
// Can't make the regex a constant here as it won't be visible to the injected code
function addDupeCheck() {
    function addDupeWarn(historybtn, dupe) {
        historybtn.removeClass('btn-default').addClass(dupe ? 'btn-danger' : 'btn-success');
    }

    function checkDuped(oid, btn) {
        $.get("/item/" + oid, function (html) {
            var dupe = /At least two versions of this item exist. Items with non-chronological IDs are highlighted in red./.test(html);
            window.dupeCache[oid] = dupe;
            window.addDupeWarn(btn, dupe);
        });
    }

    function createDetails(item) {
        var details = window.dupe_createDetails(item),
            oid = item.attr('data-original-id'),
            historybtn = details.find('.fa-calendar-o').parent();

        if (window.dupeCache[oid] != null) { // undefined/null (none/in progress)
            window.addDupeWarn(historybtn, window.dupeCache[oid]);
        } else {
            historybtn.mouseover(function () {
                if (window.dupeCache[oid] !== null) { // not in progress
                    window.dupeCache[oid] = null;
                    setTimeout(function () {
                        window.checkDuped(oid, historybtn);
                    }, 80);
                }
            });
        }

        return details;
    }

    Script.exec('var dupe_createDetails = window.createDetails, dupeCache = {};'+
                'window.checkDuped = ' + checkDuped + ';'+
                'window.addDupeWarn = ' + addDupeWarn + ';'+
                'window.createDetails = ' + createDetails + ';');
}

function bpDupeCheck() {
    var items = [];

    $('.item:not(.spacer,.unselected):visible').each(function () {
        var $this = $(this),
            stack = Page.addItemIcon($this);

        if (stack.find('.dupe-check-result').length) return;

        stack.append('<div class="arrow-icon"><i class="fa fa-spin fa-spinner dupe-check-result"></i></div>');
        items.push($this);
    });

    if (!items.length) {
        return alert("No unchecked items in this selection");
    }

    (function next() {
        var item = items.shift(),
            spinner, oid, dc;

        if (!item) return;
        oid = item.attr('data-original-id');
        spinner = item.find('.dupe-check-result');

        function applyIcon(dupe) {
            spinner.removeClass('fa-spinner fa-spin');

            if (dupe) {
                spinner.addClass('fa-exclamation-circle').css('color', 'red');
            } else {
                spinner.addClass('fa-check-circle').css('color', 'green');
            }

            next();
        }

        dc = Script.window.dupeCache;
        if (dc.hasOwnProperty(oid)) return applyIcon(dc[oid]);
        $.get("/item/" + oid, function (html) {
            var dupe = /Refer to entries in the item history <strong>where the item ID is not chronological/.test(html);
            dc[oid] = dupe;
            applyIcon(dupe);
        });
    }());
}

function addBackpackDupeCheck() {
    MenuActions.addAction({
        name: 'Dupe-Check Collection',
        icon: 'fa-check',
        id: 'dupe-check',
        click: bpDupeCheck
    });
}

function load() {
    addDupeCheck();
    if (Page.isBackpack()) {
        addBackpackDupeCheck();
    }
}

module.exports = load;

},{"../menu-actions":22,"../page":23,"../script":26}],8:[function(require,module,exports){
var Prefs = require('../preferences'),
    Script = require('../script'),
    Pricing = require('../pricing'),
    Cache = require('../cache'),
    Page = require('../page');

function addMorePopovers(more) {
    var moreCache = {},
        moreLoading = {};

    Page.addPopovers(more, $('.row:eq(4)'), {
        next: function (fn) {
            var $this = $(this),
                vote = $this.closest('.vote'),
                url = vote.find('.vote-stats li:eq(1) a').attr('href');

            function showPopover(html) {
                fn({content: html, placement: "right"});
            }

            if (moreCache[url]) return showPopover(moreCache[url]);
            if (moreLoading[url]) return;

            moreLoading[url] = true;
            $.get(url).done(function (page) {
                var html = $($.parseHTML(page)).find('.op .body').html();
                moreCache[url] = html;

                showPopover(html);
            }).always(function () {
                moreLoading[url] = false;
            });
        },
        delay: 0
    });
}

function refValue() {
    var refvalue = $("#refinedvalue");

    if (!refvalue.length) return;

    Pricing.shared(function (ec) {
        refvalue.tooltip({
            title: function () {
                return ec.format({value: +refvalue.text().replace(/,/g, ''), currency: 'metal'}, EconCC.Mode.Long);
            }
        });
    });
}

function addUnusualDetailsButtons() {
    function createDetails(item) {
        var details = window.uDetails_createDetails(item),
            data = item[0].dataset;

        if (data.app === "440" && data.quality === "5" && data.effect_name) {
            details.find('.fa-list-alt').parent().after(
                '<a class="btn btn-default btn-xs" href="/unusuals/' + data.name + '"><i class="fa fa-diamond"></i> Unusual</a>'+
                '<a class="btn btn-default btn-xs" href="/effects/' + data.effect_name + '"><i class="fa fa-magic"></i> Effect</a>'
            );

        }

        return details;
    }

    Script.exec('var uDetails_createDetails = window.createDetails;'+
                'window.createDetails = ' + createDetails + ';');
}

function thirdPartyPrices() {
    if (Prefs.pref('other', 'thirdpartyprices')) return;

    function createDetails(item) {
        var statsName = item.data('converted_from') ? item.data('converted_from') : item.data('name');
        var friendlyUrl = '/' + item.data('q_name') + '/' + encodeURIComponent(statsName) + '/' + (item.data('tradable') == 1 ? "Tradable" : "Non-Tradable") + '/' + (item.data('craftable') == 1 ? "Craftable" : "Non-Craftable");

        if (item.data('priceindex') && item.data('priceindex') !== 0) {
            friendlyUrl += '/' + item.data('priceindex');
        }

        window.price_cache[friendlyUrl] = {};
        return window.tpp_createDetails(item);
    }

    Script.exec('var tpp_createDetails = window.createDetails;'+
                'window.createDetails = ' + createDetails + ';');
}

function global() {
    var account = $('.navbar-profile-nav .dropdown-menu a[href="/my/account"]'),
        help = $('.dropdown a[href="/help"]'),
        more = $('.text-more');

    if (location.pathname === '/' ||
        (Prefs.pref('homebg', 'replacewalls') &&
            /\/img\/bricks_/.test(getComputedStyle(document.body)['background-image']))) {
        applyWallpaper();
    }

    if (account.length) account.parent().after('<li><a href="/my/preferences"><i class="fa fa-fw fa-cog"></i> My Preferences</a></li>');
    if (help.length) help.parent().before('<li><a href="/lotto"><i class="fa fa-fw fa-money"></i> Lotto</a></li>');
    if (more.length) addMorePopovers(more);

    $('.navbar-game-select li a').each(function () {
        var appid = +this.href.replace(/\D/g, ""),
            sub = "";

        //if (appid === 440) // Nothing special
        if (appid === 570) sub += "dota2.";
        else if (appid === 730) sub += "csgo.";

        this.href = "http://" + sub + "backpack.tf" + location.pathname;
        this.target = "_blank";
     });

    if (Prefs.pref('other', 'originalkeys')) {
        $('[data-converted-from]').each(function () {
            var $this = $(this),
                output = $this.find('.output');

            $this.find('.item-icon').css('background-image', output.css('background-image'));
            output.remove();
        });
    }

    if (Page.isBackpack()) {
        refValue();
    }

    addUnusualDetailsButtons();
    thirdPartyPrices();
}

function updateWallpaperCache(url, then) {
    var wallcache = new Cache("bes-cache-wallpaper", 0);

    if (wallcache.get("url").value !== url) {
        Script.GET(url, function (resp) {
            var wp = resp.replace(/\r/g, "").split("\n");

            wallcache.set("url", url).set("wallpapers", wp).save();
            then(wp);
        });
    } else {
        then(wallcache.get("wallpapers").value);
    }
}

function applyWallpaper() {
    var wallpaper = Prefs.prefs.features.homebg,
        url = wallpaper.image.trim();

    function csstext(img) {
        return 'background: url(' + img + '); background-repeat: ' + wallpaper.repeat + '; background-position: ' + wallpaper.posx + ' ' + wallpaper.posy + '; background-attachment: ' + wallpaper.attachment + '; background-size: ' + wallpaper.sizing + ';';
    }

    if (url) {
        if (url.match(/pastebin\.com\/raw.php\?i=/)) {
            updateWallpaperCache(url, function (wallpapers) {
                var wallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)].trim();
                if (wallpaper) document.body.style.cssText = csstext(wallpaper);
            });
        } else {
            document.body.style.cssText = csstext(url);
        }
    }
}

function index() {
    function updateNotifications() {
        if (!notifsu) {
            $.get("/notifications");
            notifsu = true;
        }
    }

    var lotto = Prefs.pref('lotto', 'show'),
        updatec = Prefs.pref('notifications', 'updatecount'),
        notifs = $('.notification-list'),
        notifa = $('.md-notification-alert'),
        notifsu = false,
        newnotif;

    if (!lotto) {
        Script.exec("updateLotto = $.noop;");
        $('.lotto-box').remove();
    }

    if (notifs.length && updatec !== 'no') {
        newnotif = notifs.find(".notification.new");

        if ((updatec === 'load' && newnotif.length) ||
            (updatec === 'listing' && newnotif.find('.subject a:contains([removed listing])').length)) {
            newnotif.removeClass('.new');
            $("#notifications_new").remove();

            updateNotifications();
        }

        if (updatec === 'click' || updatec === 'listing') {
            notifs.find(".notification").click(updateNotifications).attr("target", "_blank");
        }
    } else if (notifa.length && updatec === 'load') {
        updateNotifications();
    }

    if (notifa.length) notifa[0].setAttribute("target", "_blank");
}

function load() {
    global();
    if (location.pathname === '/') index();
}

module.exports = load;

},{"../cache":3,"../page":23,"../preferences":24,"../pricing":25,"../script":26}],9:[function(require,module,exports){
var Prefs = require('../preferences'),
    Page = require('../page'),
    Quicklist = require('./quicklist'),
    DataStore = require('../datastore'),
    Key = require('../helpers/apikey'),
    Cache = require('../cache');

function addTab() {
    $("#settings-tabs").append('<li><a href="#bes">Enhancement Suite</a></li>');
    $('#settings-tabs [href="#bes"]').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
}

function addTabContent() {
    function section(name, fields) {
        return [
            '<section>',
            '<h4>' + name + '</h4>',
            fields.join(""),
            '</section>'
        ].join("");
    }

    function buttons(name, component, key, bts) {
        return [
            '<div class="form-group">',
            '<label>' + name + '</label>',
            '<div class="btn-group" data-toggle="buttons" data-component="' + component + '" data-key="' + key + '">',
            bts,
            '</div>',
            '</div>'
        ].join("");
    }

    function button(text, id, fields) {
        return [
            '<div class="form-group">',
            '<a class="btn btn-primary"' + (id ? ' id="' + id + '"' : '') + '>' + text + '</a>',
            fields || "",
            '</div>'
        ].join("");
    }

    function userInput(label, component, key, value, placeholder) {
        return [
            '<div class="form-group">',
            '<label>' + label + '</label>',
            '<input type="text" class="form-control active" value="' + Page.escapeHtml(value || "") + '" placeholder="' + Page.escapeHtml(placeholder || "") + '" data-component="' + component + '" data-key="' + key + '">',
            '</div>',
        ].join("");
    }

    function yesno(yes, labels) {
        labels = labels || ["Yes", "No"];

        return [
            '<label class="btn btn-primary' + (yes ? ' active' : '') + '"><input type="radio" value="true"' + (yes ? ' checked' : '') + '>' + labels[0] + '</label>',
            '<label class="btn btn-primary' + (yes ? '' : ' active') + '"><input type="radio" value="false"' + (yes ? '' : ' checked') + '>' + labels[1] + '</label>'
        ].join("");
    }


    function buttonsyn(name, component, key) {
        return buttons(name, component, key, yesno(Prefs.pref(component, key)));
    }

    function userInputp(label, component, key, placeholder) {
        return userInput(label, component, key, Prefs.pref(component, key), placeholder);
    }

    function buttonsChoice(name, component, key, choices) {
        return buttons(name, component, key, choice(choices, Prefs.pref(component, key)));
    }

    function choice(choices, active) {
        var html = "";

        choices.forEach(function (choice) {
            html += '<label class="btn btn-primary' + (choice.value === active ? ' active' : '') + '"><input type="radio" value="' + choice.value + '"' + (choice.value === active ? ' checked' : '') + '>' + choice.label + '</label>';
        });

        return html;
    }

    function help(text) {
        return '<span class="help-block">' + text + '</span>';
    }

    var html = [
        '<div class="tab-pane" id="bes">',

        '<h3>backpack.tf Enhancement Suite <span class="text-muted">v' + Page.SUITE_VERSION + '</span></h3>',
        '<div class="padded">',

        buttonsChoice('Notifications widget', 'notifications', 'updatecount', [
            {value: 'no', label: 'No'},
            {value: 'click', label: 'Notification click'},
            {value: 'listing', label: 'Removed listing'},
            {value: 'load', label: 'Always'},
        ]),
        help("Requires you to have donated and disabled ads in favor of the notifications widget (Awesome perks tab). This setting applies only to the notifications widget which is on the site index page. Updates the notifications count badge when a notification is clicked, when you have a [removed listing] notification, or always."),

        section('Classifieds', [
            userInputp('Sell order signature', 'classifieds', 'signature'),
            help("Message automatically inserted in the 'Message' field of Classified sell order listings you create manually."),
            userInputp('Buy order signature', 'classifieds', 'signature-buy', Prefs.pref('classifieds', 'signature-buy')),
            help("Message automatically inserted in the 'Message' field of Classified buy order listings you create manually."),
            buttonsyn('Auto-close when listed successfully', 'classifieds', 'autoclose'),
            help("Automatically close the page when you successfully post a Classifieds listing manually."),
            buttonsChoice('Auto-fill price', 'classifieds', 'autofill', [
                {value: 'backpack', label: 'backpack.tf'},
                {value: 'lowestauto', label: "Lowest automatic listing"},
                {value: 'lowest', label: "Lowest listing"},
                {value: 'default', label: 'Disabled'},
            ]),
            help("Price to be used for new sell listings. Pricing and pricetag options (range, modifications) will be used to determine the backpack.tf price. The lowest listing is determined whenever peek is used (recommended to enable autopeek below). For those options, if there are no (automatic) listings, nothing will be done."),
            buttonsyn('Auto-peek', 'classifieds', 'autopeek'),

            button('Modify Quicklisting Presets', 'modify-quicklists')
        ]),

        section('Pricing', [
            help("These options are used by Pricetags and Recent price changes in backpacks."),

            buttonsChoice('Price range', 'pricing', 'range', [
                {value: EconCC.Range.Low, label: 'Low-end'},
                {value: EconCC.Range.Mid, label: 'Mid (avg)'},
                {value: EconCC.Range.High, label: 'High-end'},
            ]),
            help("Price range to be used."),

            buttonsChoice('Currency step', 'pricing', 'step', [
                {value: EconCC.Enabled, label: 'Enabled'},
                {value: EconCC.Disabled, label: 'Disabled'}
            ]),
            help("Whether currency values should be 'prettified'. Metal is rounded to the nearest weapon (except when the value is less than one), and keys are rounded to the nearest 20th. (1.40 ref -> 1.38, 2.27 keys -> 2.25 keys)"),
        ]),

        section('Pricetags', [
            help("This section requires your 'Item pricetags' (Team Fortress 2 tab) to be 'Game currency'. Only Team Fortress 2 is supported obviously."),

            buttonsChoice('Value item modifications at', 'pricetags', 'modmult', [
                {value: 0, label: '0%'},
                {value: 0.05, label: '5%'},
                {value: 0.1, label: '10%'},
                {value: 0.2, label: '20%'},
                {value: 0.25, label: '25%'},
                {value: 0.3, label: '30%'},
                {value: 0.4, label: '40%'},
                {value: 0.5, label: '50%'}
            ]),
            help("Strange Parts, Paint."),

            buttonsyn('Tooltips', 'pricetags', 'tooltips'),
            help("Adds tooltips to items that are priced in keys."),
        ]),

        section('Recent price changes in backpacks', [
            buttonsyn('Enabled', 'changes', 'enabled'),
            help("Shows recent price changes on backpack pages you visit."),

            buttonsChoice('Price change period', 'changes', 'period', [
                {value: (1000 * 60 * 60 * 8), label: '8 hours'},
                {value: (1000 * 60 * 60 * 24), label: '1 day'},
                {value: (1000 * 60 * 60 * 24 * 3), label: '3 days'},
                {value: (1000 * 60 * 60 * 24 * 5), label: '5 days'},
                {value: (1000 * 60 * 60 * 24 * 7), label: '1 week'},
            ]),

            buttonsyn('Outdated unusual warnings', 'changes', 'outdatedwarn'),
            help("Shows an warning icon on outdated unusuals (ones that were updated more than 3 months ago.) Price changes must be enabled for this feature."),
        ]),

        section('Custom homepage background', [
            userInputp('Background image url', 'homebg', 'image'),
            help("Leave blank to disable this feature. You can also link to a raw pastebin so an image can be chosen at random <a href='http://pastebin.com/raw.php?i=8CVW6S2z'>(example)</a>. Separate image urls with a newline. Images will share the same options so pick similar ones."),

            buttonsChoice('Background repeat', 'homebg', 'repeat', [
                {value: 'no-repeat', label: "Don't repeat"},
                {value: 'repeat', label: "Tiled"},
                {value: 'repeat-x', label: 'Repeat horizontally'},
                {value: 'repeat-y', label: 'Repeat veritcally'},
            ]),

            buttonsChoice('Background veritcal position', 'homebg', 'posy', [
                {value: 'top', label: "Top"},
                {value: 'center', label: "Center"},
                {value: 'bottom', label: "Bottom"},
            ]),

            buttonsChoice('Background horizontal position', 'homebg', 'posx', [
                {value: 'left', label: "Left"},
                {value: 'center', label: "Center"},
                {value: 'right', label: "Right"},
            ]),

            buttonsChoice('Background attachment', 'homebg', 'attachment', [
                {value: 'scroll', label: "Scroll with page"},
                {value: 'fixed', label: "Fixed"},
            ]),

            buttonsChoice('Background sizing', 'homebg', 'sizing', [
                {value: 'none', label: "None"},
                {value: 'cover', label: "Fill"},
                {value: 'contain', label: "Contain"},
            ]),

            buttonsyn('Replace all walls', 'homebg', 'replacewalls'),
            help("Replaces the default wall image with your background image url."),
        ]),

        section('Other', [
            help("Preferences that don't deserve their own section."),

            buttonsyn('Show lotto', 'lotto', 'show'),
            help("Shows or hides the lotto on the main page. It can still be viewed at <a href='/lotto'>backpack.tf/lotto</a>."),

            buttonsyn('Use original key icons', 'other', 'originalkeys'),
            help("Shows the original key's icon (for converted event keys) full size."),

            buttonsyn('Show third party pricing on items', 'other', 'thirdpartyprices'),
            help("Whether third party pricing (trade.tf & tf2wh) should be shown on items. This is a website feature but can be disabled here for a performance improvement, as hovering over any item (even before it shows a popover) issues a request to the backpack.tf web servers.")
        ]),

        section('Advanced', [
            button('Import preferences', 'import-prefs'),
            button('Export preferences', 'export-prefs'),
            help('Import or export your preferences for use on other computers, browsers, etc.'),

            button('Reset preferences', 'reset-prefs'),
            help('Resets your preferences (including quicklists) to the default and reloades the page.'),

            button('Clear cache', 'clear-cache'),
            help('Clears all caches. Use this if you are advised to. Clicking this button will reload the page and all your unsaved changes will be lost.'),
        ]),

        '</div>',
        '</div>'
    ].join('');

    $('#settings-panes .tab-content').append(html);
    $('#modify-quicklists').click(Quicklist.modifyQuicklists);
    $('#clear-cache').click(clearCache);
    $('#reset-prefs').click(resetPrefs);
    $('#import-prefs').click(importPrefs);
    $('#export-prefs').click(exportPrefs);

    $('#bes').on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
        var $btn = $(e.target);
        if (!$btn.hasClass('btn')) {
            $btn = $btn.closest('.btn');
        }

        $.fn.button.call($btn, 'toggle');

        if (!($(e.target).is('input[type="radio"]') || $(e.target).is('input[type="checkbox"]'))) {
            e.preventDefault();
        }
    });
}

function clearCache() {
    Cache.names.forEach(function (name) {
        DataStore.removeItem(name);
    });

    Key.keys.forEach(function (k) {
        DataStore.removeItem(k.field);
    });
    location.reload();
}

function resetPrefs() {
    DataStore.removeItem("bes-preferences");
    DataStore.removeItem("bes-quicklists");
    location.reload();
}

function importPrefs() {
    var html = '<p>Import your backpack.tf Enhancement Suite settings here. Only the format from the export dialog will work.</p><div class="row"><textarea id="import-prefs-json" class="form-control" style="height:170px;resize:vertical"></textarea></div>';
    Page.modal("Import preferences", html, '<a class="btn btn-primary" id="import-prefs-btn">Import</a>');

    $("#import-prefs-btn").click(function () {
        var p = $("#import-prefs-json").val();
        Page.hideModal();

        try {
            Prefs.saveToDS(JSON.parse(p));
            location.reload();
        } catch (ex) {
            alert("The preferences you were trying to import are corrupted.");
        }
    });
}

function exportPrefs() {
    var html = '<p>Store this code to import your preferences elsewhere.</p><div class="row"><textarea id="export-prefs-json" class="form-control" style="height:170px;resize:vertical"></textarea></div>';
    Page.modal("Export preferences", html);
    $("#export-prefs-json").val(JSON.stringify(Prefs.loadFromDS()));
}

function addHotlinking() {
    if (location.hash) {
        $('[href="#' + location.hash.replace(/#/g, '') + '"]').tab('show');
    }

    $('#settings-tabs a').click(function () {
        location.hash = '#' + this.href.substr(this.href.indexOf('#'));
    });
}

function getSettings() {
    var opts = $('#bes .active'),
        settings = {};

    opts.each(function () {
        var $this = $(this),
            component, key, value, v;

        if (!$this.data('component')) $this = $this.parent();
        component = $this.data('component');
        key = $this.data('key');
        value = $this.hasClass('active') ? $this.val() : $this.find('.active [value]').val();

        try {
            v = JSON.parse(value);
        } catch (ex) {
            v = value;
        }

        settings[component] = settings[component] || {};
        settings[component][key] = v;
    });

    return settings;
}

function addSaveButton() {
    var saveButton = $('.panel-body-alt input[type="submit"]');

    saveButton.click(function (e) {
        e.preventDefault();
        saveButton.val('Saving...').addClass('disabled');

        Prefs.applyPrefs(getSettings());
        $.post("/my/preferences_save", $("form[action='/my/preferences_save']").serialize(), function () {
            saveButton.val('Save Settings').removeClass('disabled');
        });
    });
}

function load() {
    if (location.pathname !== '/my/preferences') return;

    addTab();
    addTabContent();
    addHotlinking();
    addSaveButton();
}

module.exports = load;

},{"../cache":3,"../datastore":19,"../helpers/apikey":20,"../page":23,"../preferences":24,"./quicklist":11}],10:[function(require,module,exports){
var Page = require('../page'),
    Prefs = require('../preferences'),
    Pricing = require('../pricing'),
    Script = require('../script');
var ec;

function modmults(e) {
    var paint = e.dataset.paintPrice,
        parts = [e.dataset['part-1Price'], e.dataset['part-2Price'], e.dataset['part-3Price']],
        bc = 0;

    if (paint) {
        bc += Pricing.fromBackpack(ec, paint).value;
    }

    if (parts[0] || parts[1] || parts[2]) {
        parts.forEach(function (part) {
            if (part) bc += Pricing.fromBackpack(ec, part).value;
        });
    }

    return bc;
}

function setupInst(next) {
    Pricing.shared(function (inst) {
        ec = inst;
        next();
    });
}

function applyTagsToItems(items) {
    var tooltips = Prefs.pref('pricetags', 'tooltips'),
        modmult = Prefs.pref('pricetags', 'modmult'),
        pricedef = Pricing.default(),
        clear = false;

    [].slice.call(items).forEach(function (item) {
        var ds = item.dataset,
            di = ds.defindex,
            listing = ds.listingSteamid,
            mults = 0,
            s = {},
            o;

        if ((!ds.pBptf && !ds.pScmAll) || ds.vote || ds.app !== '440' ||
             (di === '5002' || di === '5001' || di === '5000')) return; // ignore metal

        var price = listing ? Pricing.fromListing(ec, ds.listingPrice) : Pricing.fromBackpack(ec, ds.pBptf || ds.pScmAll.split(',')[0]),
            value = price.value,
            currency = price.currency;

        if (!listing) {
            mults = modmults(item);
            if (mults !== 0) {
                value += mults * modmult;
            }

            if (mults || !pricedef) {
                clear = true;
                ds.price = value;
            }
        }

        value = ec.convertFromBC(value, currency);

        o = {value: value || 0.001, currency: currency};

        // Disable step for listings
        if (listing) s = {step: EconCC.Disabled};
        else if (ec.step === EconCC.Enabled) s = {currencies: {keys: {round: 1}}};

        ec.scope(s, function () {
            var eq = item.querySelector('.tag.bottom-right'),
                f;

            if (mults || !pricedef) {
                // Exception for keys
                if (di === '5021') f = ec.formatCurrency(o);
                else f = ec.format(o, EconCC.Mode.Label).replace('.00', '');

                eq.innerHTML = (listing ? '<i class="fa fa-tag"></i> ' : '~') + f;
            }

            if (tooltips && currency.substr(0, 3) === 'key') {
                eq.setAttribute('title', ec.format(o, EconCC.Mode.Long));
                eq.setAttribute('data-suite-tooltip', '');
                eq.classList.add('pricetags-tooltip');
            }
        });
    });

    // Clear price cache for updateValues()
    if (clear && inventory) {
        Script.exec('$(".item").removeData("price");');
        updateValues();
    }

    if (tooltips) {
        Page.addTooltips($('.pricetags-tooltip'));
    }
}

function enabled() {
    return Page.appid() === 440 && (
        Prefs.pref('pricetags', 'modmult') !== 0.5 ||
        Prefs.pref('pricetags', 'tooltips') !== false ||
        !Pricing.default()
    );
}

function load() {
    var items;

    if (!enabled()) return;

    items = document.querySelectorAll('.item');
    if (!items.length) return;

    setupInst(function () {
        ec.scope({currencies: {metal: {trailing: EconCC.Disabled}}}, function () {
            applyTagsToItems(items);
        });
    });
}

module.exports = load;

// leave module.
module.exports.setupInst = setupInst;
module.exports.applyTagsToItems = applyTagsToItems;
module.exports.enabled = enabled;

},{"../page":23,"../preferences":24,"../pricing":25,"../script":26}],11:[function(require,module,exports){
var Page = require('../page'),
    Script = require('../script'),
    DataStore = require('../datastore');

var currencyNames = {"long":{"keys":["key","keys"],"metal":["ref","ref"]},"short":{"keys":["k","k"],"metal":["r","r"]}},
    defaults = [
        {metal: 0.05, keys: 0,  message: ""},
        {metal: 0.11, keys: 0, message: ""},
        {metal: 0, keys: 1, message: ""}
    ],
    values;

function loadQuicklists() {
    var customlists = DataStore.getItem("bes-quicklists");

    if (customlists) {
        values = JSON.parse(customlists);
    } else {
        values = defaults;
        DataStore.setItem("bes-quicklists", JSON.stringify(values));
    }
}

function addQuicklistPanelButtons() {
    $('#show-markdown-modal').before(' <a id="bp-custom-select-ql" class="btn btn-default btn-primary btn-xs disabled" href="##">Quicklist selection</a>');
}

function updateSelectQuicklist() {
    $("#bp-custom-select-ql").toggleClass("disabled", !inventory.selectionMode);
}

function onActionButtonClick() {
    var $this = $(this),
        action = $this.data('action');

    if (action === 'select') {
        copyButtonValues(values[$(this).data('idx')], $('.ql-button-values'));
    } else if (action === 'listbatch') {
        listSelection(buttonValue($('.ql-button-values')));
        Page.hideModal();
    }
}

function findSample() {
    return $('[data-listing_offers_url]').first();
}

function currentSelection() {
    return $('.item:not(.spacer,.unselected,.ql-cloned):visible').filter(function () {
        var item = $(this);
        return item.data("can_sell") && !item.data("listing_steamid");
    });
}

function qlFormatValue(value, short) {
    var str = [],
        cnames = currencyNames[short ? "short" : "long"],
        space = short ? "" : " ";

    if (value.keys) str.push(value.keys + space + cnames.keys[+(value.keys !== 1)]);
    if (value.metal) str.push(value.metal + space + cnames.metal[+(value.metal !== 1)]);
    return str.join(', ');
}

function addStyles() {
    Page.addStyle(
        ".ql-button-value-idx { margin-right: 3px; }"
    );
}

function quicklistSelectHtml(value, idx) {
    return '<a class="btn btn-primary ql-button-value-idx ql-action-button" data-action="select" data-idx="' + idx + '" style="margin-right: 3px;">' + qlFormatValue(value, true) + '</a>';
}

function quicklistBtnHtml(metal, keys, message, remove) {
    return '<div class="ql-button-values">'+
        '<div class="row">'+
            '<div class="col-md-3"><label>Metal</label>'+
            '<input type="text" placeholder="0" class="col-md-3 ql-metal form-control" value="' + metal + '"></div>'+
            '<div class="col-md-3"><label>Keys</label>'+
            '<input type="text" placeholder="0" class="col-md-3 ql-keys form-control" value="' + keys + '"></div>'+
        (remove !== false ? '<a class="btn btn-primary btn-xs ql-remove-button">Remove</a>' : '')+
        '</div>'+
        '<div class="row">'+
            '<div class="col-md-12"><label>Message</label>'+
            '<input type="text" class="col-md-3 form-control ql-message" value="' + Page.escapeHtml(message) + '"></div>'+
        '</div>'+
        '</div>';
}

function selectQuicklist() {
    var selection;
    if (!findSample().length) {
        return window.alert("Create a regular listing first, so the trade offer url can be copied.");
    }

    selection = currentSelection();
    if (!selection.length) {
        return window.alert("No listable items in this selection.");
    }

    var html =
        "<p>Select a preset for this batch of items, or enter one manually. Click on the respective button to fill in the values.</p>"+
        "<div id='ql-cloned-batch' class='row'></div>"+
        "<div id='ql-button-listing' class='row'>";

    values.forEach(function (vals, idx) {
        html += quicklistSelectHtml(vals, idx);
    });

    html += "</div><br>";
    html += quicklistBtnHtml("", "", "", "", false);

    Page.modal("List Items", html, '<a class="btn btn-default btn-primary ql-action-button" data-action="listbatch">List Batch</a>');

    $("#ql-cloned-batch").html(selection.clone()).find('.item').addClass('ql-cloned');
    $("#ql-button-listing .ql-select-msg").last().css('margin-bottom', '-8px');
    $(".ql-button-value-idx").tooltip({
        html: false,
        title: function () { return values[$(this).data('idx')].message || "(none)"; },
        placement: 'top'
    });

    Page.addItemPopovers($('.ql-cloned'), $('#ql-cloned-batch'));
}

function addEventListeners() {
    $(document).on('click', '.ql-action-button', onActionButtonClick);

    $("#bp-custom-select-ql").click(function () {
        if (inventory.selectionMode) {
            selectQuicklist();
        }
    });
}


function listSelection(value) {
    var selection = currentSelection(),
        sample = findSample(),
        items = [],
        at = 0;

		clearSelection();
		updateSelectQuicklist();
		updateClearSelectionState();

    selection.each(function () {
        var $this = $(this);
        items.push($this.data('id'));

        $this.find('.tag.bottom-right').html('<i class="fa fa-spin fa-spinner"></i>');
    });

    function next() {
        if (!items[at]) return;
        listItem(items[at], value, sample, function () {
            at += 1;
            next();
        });
    }

    next();
}

function listItem(id, value, sample, then) {
    var payload = {
        details: value.message,
        offers: +!!sample.data('listing_offers_url'), // value -> bool -> int
        buyout: sample.data('listing_buyout'),
        tradeoffer_url: sample.data('listing_offers_url'),
        'user-id': Page.csrfToken(),
        currencies: {
            metal: value.metal,
            keys: value.keys
        }
    };

    // id: current item id
    $.post("http://backpack.tf/classifieds/sell/" + id, payload, function (page) {
        var ok = /<div class="panel-heading">Sell Orders<\/div>/.test(page),
            item = $('[data-id="' + id + '"]');

        item.css('opacity', 0.6).data('can-sell', 0)
            .find('.tag.bottom-right').html(ok ? '<i class="fa fa-tag"></i> ' + qlFormatValue(value, false) : '<i class="fa fa-exclamation-circle" style="color:red"></i>');

        if (then) then();
    });
}

function collectButtonValues() {
    var elems = $('.ql-button-values'),
        values = [];

    elems.each(function () {
        values.push(buttonValue($(this)));
    });

    return values;
}

function buttonValue(elem) {
    return {
        metal: +(Math.abs(parseFloat(elem.find('.ql-metal').val())).toFixed(2)) || 0,
        keys: Math.abs(parseInt(elem.find('.ql-keys').val(), 10)) || 0,
        message: elem.find('.ql-message').val() || ""
    };
}

function copyButtonValues(value, elem) {
    var i;

    for (i in value) {
        if (!value.hasOwnProperty(i)) continue;
        elem.find('.ql-' + i).val(value[i] || (i === "message" ? "" : "0"));
    }
}

if (Page.isBackpack()) {
    inventory.clearSelection = function() {
        if (inventory.selectionMode) {
            selectItem($('.item'));
            disableSelectionMode();
            updateValues();
            updateClearSelectionState();
        }
    };
}

function disableSelectionMode() {
    inventory.selectionMode = false;
    ITEM_POPOVERS_DISABLED = false;
};

function updateValues() {
    var li,
        totalkeys = 0,
        totalmetal = 0,
        curvalue = 0,
        marketvalue = 0,
        totalitems = 0;

    if (inventory.selectionMode) {
        li = $('.item:not(.spacer,.unselected):visible');
    } else {
        li = $('.item:not(.spacer):visible');
    }

    li.each(function () {
        // only count items
        totalitems++;
        curvalue = curvalue + parseFloat($(this).data('price'));

        if ($(this).data('market-p') && $(this).data('market-p') != -1) {
            marketvalue += $(this).data('market-p');
        }

        if ($(this).data('app') == 440) {
            switch ($(this).data('defindex')) {
                case 5000:
                    totalmetal += 0.111111;
                    break;

                case 5001:
                    totalmetal += 0.333333;
                    break;

                case 5002:
                    totalmetal++;
                    break;
            }
        }

        if ($(this).data('is-key')) {
            totalkeys++;
        }
    });

    if (totalmetal % 1 >= 0.9) {
        // If it's x.99, round up
        totalmetal = Math.round(totalmetal);
    }

    $('#keycount').html(totalkeys.format());
    $('#metalcount').html((Math.floor(totalmetal * 100) / 100).toFixed(2));
    $('#refinedvalue').html(Math.round(curvalue).format());
    $('#dollarvalue').html(Math.round(curvalue * rawValue).format());
    $('#marketvalue').html(Math.round(marketvalue / 100).format());
    $('#totalitems').html(totalitems.format());
};

function clearSelection() {
    if (inventory.selectionMode) {
        selectItem($('.item'));
        disableSelectionMode();
		updateValues();
		updateClearSelectionState();
    }
};

function updateClearSelectionState() {
    if (inventory.selectionMode) {
        $('#clear-selection').removeClass('disabled');
    } else {
        $('#clear-selection').addClass('disabled');
    }
};

function modifyQuicklists() {
    var html =
        "<p>Add, edit, and remove quicklist presets here. Metal can have two decimals, keys must be integers (no decimals). If any value is missing, it is defaulted to 0, with the exception of the message, which then is empty.</p>"+
        "<div id='ql-button-listing'>";

    values.forEach(function (vals) {
        html += quicklistBtnHtml(vals.metal, vals.keys, vals.message);
    });
    html += "</div>"+
        '<a class="btn btn-default ql-add-button">Add</a>';

    Page.modal("Modify Quicklist Presets", html, '<a class="btn btn-default btn-primary ql-save-button">Save</a>');

    $('.ql-save-button').click(function () {
        values = collectButtonValues().filter(function (v) {
            return (v.metal || v.keys) && isFinite(v.metal) && isFinite(v.keys);
        });

        DataStore.setItem("bes-quicklists", JSON.stringify(values));
        Page.hideModal();
    });

    $('.ql-add-button').click(function () {
        $("#ql-button-listing").append(quicklistBtnHtml("", "", "", ""));
    });

    $('#ql-button-listing').on('click', '.ql-remove-button', function () {
        $(this).parent().remove();
    });
}

function addSelectPage() {
    var bp = inventory;
    function selectItems(items) {
        inventory.selectionMode = true;
        Page.selectItem(items);

        updateClearSelectionState();
        updateValues();
        updateSelectQuicklist();
    }

    $('#backpack').on('click', '.select-page', function () {
        var pageitems = $(this).closest('.backpack-page').find('.item').not('.spacer').filter(':visible');

        if (!pageitems.length) return;

        if (inventory.selectionMode) {
            if (pageitems.length === pageitems.not('.unselected').length) { // all == selected
                Page.unselectItem(pageitems);

                if ($('.item:not(.unselected)').length === 0) {
                        clearSelection();
						updateSelectQuicklist();
						updateValues();
                    return;
                }
            } else {
                selectItems(pageitems);
            }
        } else {
            Page.unselectItem($('.item'));
            selectItems(pageitems);
        }
    });
}

function addSelectPageButtons() {
    $('.page-number').each(function () {
        var $this = $(this),
            label = $this.find('.page-anchor'),
            sp;

        if (!label[0]) return;
        sp = $this.find('.select-page');

        if (sp.length) {
            return;
        }

        if (!$this.nextUntil('.page-number').not('.spacer').filter(':visible').length) return;
        label.after('<span class="btn btn-primary btn-xs pull-right select-page" style="margin-right: 2.7%;margin-top: -0.1%;">Select Page</span>');
    });
}

function addHooks() {
    $('clear-selection').click(function () {
        if (!$(this).hasClass('disabled')) {
            updateSelectQuicklist();
        }
    });

    Script.exec(
        "var old_updateDisplay = window.backpack.updateDisplay;"+
        addSelectPageButtons+
        "window.backpack.updateDisplay = function () { old_updateDisplay.call(window.backpack); addSelectPageButtons(); }"
    );
}

function addItemShiftClick() {
    var $i = $('.item:not(.spacer)'),
        bp = inventory,
        $last, $select;

    Script.exec("$('.item:not(.spacer)').off('click');");
    $i.click(function (e) {
        var $this = $(this),
            $lidx;

        updateSelectQuicklist();

        if (!inventory.selectionMode) {
            $last = null;
            if ($this.siblings('.popover').length === 0) {
                // Touchscreen compatibility.
                // Makes it so a popover must be visible before selection mode can be activated.
                return;
            }

            inventory.selectionMode = true;
            Page.unselectItem($('.item'));
            Page.selectItem($this);
            $last = $this;

            updateClearSelectionState();
        } else {
            if ($this.hasClass('unselected')) {
                if (e.shiftKey && $last && $last.not('.unselected') && ($lidx = $i.index($last)) !== -1) {
                    e.preventDefault();
                    document.getSelection().removeAllRanges();

                    if ($lidx > $i.index($this)) {
                        $select = $last.prevUntil($this);
                    } else {
                        $select = $last.nextUntil($this);
                    }

                    $last = $this;
                    Page.selectItem($select.add($this));
                } else {
                    $last = $this;
                    Page.selectItem($this);
                }
            } else {
                $last = null;
                Page.unselectItem($this);

                if ($('.item:not(.unselected)').length === 0) {
                    inventory.selectionMode = false;
                    Page.selectItem($('.item'));
                    updateClearSelectionState();
					updateValues();
                }
            }
        }

        $('#clear-selection').click(function () {
            if (!$(this).hasClass('disabled')) {
                disableSelectionMode();
            }
        });

        updateValues();
    });
}

function load() {
    addStyles();
    loadQuicklists();

    if (Page.isBackpack()) {
        addHooks();
        addSelectPage();
        addSelectPageButtons();
        addItemShiftClick();
    }

    if (!Page.isUserBackpack() || Page.appid() !== 440) return;

    addQuicklistPanelButtons();
    addEventListeners();
}

module.exports = load;
module.exports.modifyQuicklists = modifyQuicklists;

},{"../datastore":19,"../page":23,"../script":26}],12:[function(require,module,exports){
var MenuActions = require('../menu-actions');
var Script = require('../script');

var refreshed = [],
    listings;

function addRefreshButtons() {
    $('.media.listing').filter(':has(.listing-intent-sell)').find('.listing-report').each(function () {
        $(this).parent().prepend(
            '<a class="btn btn-xs btn-bottom btn-primary listing-refreshbp" data-tip="top" title="" data-original-title="Refresh this user\'s backpack.">'+
            '<i class="fa fa-sw fa-refresh"></i>'+
            '</a>'
        );
    });

    listings = !!$('.listing-refreshbp').length;
}

function addButtonTooltips() {
    Script.exec("$('.listing-refreshbp').tooltip({placement: get_tooltip_placement, animation: false});");
}

function updateBackpack(steamid, next) {
    if (refreshed[steamid]) {
        next();
    } else {
        refreshed.push(steamid);
        $.get("http://backpack.tf/profiles/" + steamid, next);
    }
}

function findSteamid(refresh) {
    var accountId = refresh.closest('.media.listing').find('.media-object').find('li').data('listing_account_id');
    var steamId = Math.abs(accountId + 76561197960265728);
    return steamId
}

function addButtonListeners() {
    $('.listing-buttons').on('click', '.listing-refreshbp', function () {
        var $this = $(this);

        updateBackpack(findSteamid($this), function () {
            $this.fadeOut();
        });
    });
}

function refreshAll(e) {
    var steamids = [],
        at = 0;

    if (e) e.preventDefault();

    $('.listing-refreshbp').each(function () {
        var $this = $(this);
        steamids.push([findSteamid($this), $this]);
    });

    (function next() {
        if (steamids[at]) {
            updateBackpack(steamids[at][0], function () {
                steamids[at][1].fadeOut();
                at += 1;
                next();
            });
        } else {
            location.reload();
        }
    }());
}

function addMenuAction() {
    MenuActions.addAction({
        name: 'Refresh All',
        icon: 'fa-refresh',
        id: 'refresh-all',
        click: refreshAll
    });
}

function addRallHeader() {
    var header = $('<span class="pull-right"><small><a href="#" id="header-refresh-all">Refresh All</a></small></span>');
    header.find('#header-refresh-all').click(refreshAll);

    $('.panel-heading:contains(Sell Orders)').append(header);
}


function load() {
    addRefreshButtons();

    if (!listings) return;

    addButtonTooltips();
    addButtonListeners();
    if (location.pathname === '/classifieds' || location.pathname === '/classifieds/') addRallHeader();
    addMenuAction();
}

module.exports = load;

},{"../menu-actions":22,"../script":26}],13:[function(require,module,exports){
var Script = require('../script'),
    Cache = require('../cache'),
    Page = require('../page');

var bans = [],
    bansShown = false,
    cachePruneTime = 60 * 30 * 1000, // 30 minutes (in ms)
    issuers = ["srBans", "bzBans", "opBans", "stfBans", "bptfBans"],
    reptfSuccess = true,
    steamid, repCache;

function addMiniProfileButton() {
    function generateMiniProfile(element) {
        var profile = window.rep_gmp(element);

        profile.find('.stm-tf2outpost').parent().html('<i class=\"stm stm-tf2outpost\"></i> Outpost');
        profile.find('.stm-bazaar-tf').parent().html('<i class=\"stm stm-bazaar-tf\"></i> Bazaar');
        profile.find('.mini-profile-third-party').append(
            ' <a class=\"btn btn-default btn-xs\" target=\"_blank\" href=\"https://rep.tf/'+ element.attr('data-id')+'\">'+
            '<i class=\"fa fa-check-square\"></i> RepTF</a>'
        );
        return profile;
    }

    Script.exec('var rep_gmp = generateMiniProfile;'+
                'window.generateMiniProfile = ' + generateMiniProfile);
}

function showBansModal() {
    if (!bans.length) return;

    var html = "<b style='color:red'>User is banned on</b> ⋅ <a href='https://rep.tf/" + steamid + "' target='_blank'>rep.tf</a><br><br><ul>";
    bans.forEach(function (ban) {
        html += "<li><b>" + ban.name + "</b> - " + ban.reason + "</li>";
    });
    html += "</ul>";

    Page.modal("Community bans", html);
}

function addProfileButtons() {
    $('.btn > .stm-tf2outpost').parent().after(' <a class="btn btn-primary btn-xs" href="https://rep.tf/' + steamid + '" target="_blank"><i class="fa fa-check-square"></i> rep.tf</a>');
    $('small:contains(Community)').html('Community <a id="showrep" style="font-size: 14px; cursor: pointer;">+</a>');

    $('#showrep').click(function () {
        var open = this.textContent === '+';

        if (open && !bansShown) {
            showBansModal();
            bansShown = true;
        }

        this.textContent = open ? '-' : '+';
        $('.rep-entry').toggle(open);
    });
}

function addIssuers() {
    var groups = [];

    function spinner(name) {
        var id = name.replace(/\.|-/g, '').toLowerCase();
        groups.push(
            "<li id='" + id + "ban' class='rep-entry' style='display: none'><small>" + name + "</small>"+
            "<span class='label pull-right label-default rep-tooltip' data-placement='bottom'>"+
            "<i class='fa fa-spin fa-spinner'></i></span></li>"
        );
    }

    spinner("Outpost");
    spinner("Bazaar");
    $('.community-statii .stats li').last().after($(groups.join("")));
}

function checkBans() {
    var value;

    repCache = new Cache("bes-cache-reptf", cachePruneTime);
    value = repCache.get(steamid);

    if (value.update) {
        updateCache();
    } else {
        showBans(value.value);
    }
}

function compactResponse(json) {
    var compact = {success: json.success};

    issuers.forEach(function (issuer) {
        if (!json[issuer]) return;
        compact[issuer] = {banned: json[issuer].banned, message: json[issuer].message};
    });

    return compact;
}

function updateCache() {
    Script.POST("https://rep.tf/api/bans?str=" + steamid, function (resp) {
        var json;

        try {
            json = compactResponse(JSON.parse(resp));
        } catch (ex) {
            json = {success: false};
        }

        reptfSuccess = json.success;
        repCache.set(steamid, json);
        if (json.success) repCache.save();

        showBans(json);
    },
    {headers: {Referer: 'https://rep.tf/' + steamid, 'X-Requested-With': 'XMLHttpRequest', Origin: 'https://rep.tf'}}
   );
}

function addRepTooltips() {
    $('.rep-tooltip').tooltip({
        html: true,
        title: function () { return this.dataset.content; }
    });
}

function showBans(json) {
    function ban(name, obj) {
        var id = name.replace(/\.|-/g, '').toLowerCase(),
            status = $('#' + id + 'ban').find('.rep-tooltip');

        status.removeClass('label-default');

        if (reptfSuccess) {
            if (!obj || !obj.banned) {
                return status.addClass("label-warning").data('content', "Ban status could not be retrieved.").text("ERR");
            }

            if (obj.banned === "bad") {
                bans.push({name: name, reason: obj.message});
            }

            status.addClass("label-" + ({good: "success", bad: "danger"}[obj.banned]))
            .data('content', obj.message)
            .text({good: "OK", bad: "BAN"}[obj.banned]);
        } else {
            status.addClass("label-warning").data('content', "Ban status could not be retrieved.").text("ERR");
        }
    }

    ban("SteamRep", json.srBans);
    ban("Outpost", json.opBans);
    ban("Bazaar", json.bzBans);
    ban("Backpack.tf", json.bptfBans);

    addRepTooltips();
    Page.$id('showrep').style.color = reptfSuccess ? (bans.length ? '#D9534F' : '#5CB85C') : '#F0AD4E';
}

function load() {
    // Global
    addMiniProfileButton();

    // Profiles only
    if (!Page.isProfile()) return;
    steamid = Page.profileSteamID();

    addProfileButtons();
    addIssuers();
    checkBans();
}

module.exports = load;

},{"../cache":3,"../page":23,"../script":26}],14:[function(require,module,exports){
var Script = require('../script');

// function (rgb) { return ((parseInt(rgb.substr(0, 2), 16) - 45).toString(16) + (parseInt(rgb.substr(2, 2), 16) - 45).toString(16) + (parseInt(rgb.substr(4, 2), 16) - 45).toString(16)).toUpperCase(); }
var appQualities = {
    440: {
        qualities: {
            // background, border
            "Normal": ["#B2B2B2", "#858585"],
            "Genuine": ["#4D7455", "#204728"],
            //"rarity2": "#8D834B",
            "Vintage": ["#476291", "#1a3564"],
            //"rarity3": "#70550F",
            "Unusual": ["#8650AC", "#59237f"],
            "Unique": ["#FFD700", "#d2aa00"],
            "Community": ["#70B04A", "#43831D"],
            //"Valve": "#A50F79",
            "Self-Made": ["#70B04A", "43831D"],
            //"Customized": ["#B2B2B2", "#858585"],
            "Strange": ["#CF6A32", "#a23d05"],
            //"Completed": ["#B2B2B2", "#858585"],
            "Haunted": ["#38F3AB", "#0bc67e"],
            "Collector's": ["#830000", "#560000"]
        },
        qids: {
            "normal": 0,
            "genuine": 1,
            "rarity2": 2,
            "vintage": 3,
            "rarity3": 4,
            "unusual": 5,
            "unique": 6,
            "community": 7,
            "valve": 8,
            "self-made": 9,
            "customized": 10,
            "strange": 11,
            "completed": 12,
            "haunted": 13,
            "collector's": 14,
            "decorated weapon": 15
        },
        defquality: "Unique"
    },
    570: {
        qualities: {
            "Base": ["#B2B2B2", "#858585"],
            "Genuine": ["#4D7455", "#204728"],
            "Elder": ["#476291", "#1a3564"],
            "Unusual": ["#8650AC", "#59237f"],
            //"Standard": "",
            //"Community": "",
            //"Valve": "",
            "Self-Made": ["#70B04A", "#43831D"],
            //"Customized": "",
            "Inscribed": ["#CF6A32", "#a23d05"],
            //"Completed": "",
            "Cursed": ["#8650AC", "#59237f"],
            "Heroic": ["#8650AC", "#59237f"],
            "Favored": ["#FFFF00", "#D2D22D"],
            "Ascendant": ["#EB4B4B", "#BE1E1E"],
            "Autographed": ["#ADE55C", "#80B82F"],
            "Legacy": ["#FFFFFF", "#D2D2D2"],
            "Exalted": ["#CCCCCC", "#9F9F9F"],
            "Frozen": ["#4682B4", "#195587"],
            "Corrupted": ["#A52A2A", "#780303"],
            "Auspicious": ["#32CD32", "#50A050"],
        },
        defquality: "Base"
    },
    730: {
        qualities: {
            "Normal": ["#B2B2B2", "#858585"],
            //"Normal": ["#D2D2D2", "#A5A5A5"],
            "StatTrak™": ["#CF6A32", "#a23d05"],
            "Souvenir": ["#FFD700", "#d2aa00"],
            "★": ["#8650AC", "#59237f"],
            //"★ StatTrak™": ["#8650AC", "#59237f"],
            "Prototype": ["#70B04A", "#43831D"]
        },
        defquality: "Normal"
    }
};

var appnames = {"Team Fortress 2": 440, "Counter-Strike: Global Offensive": 730, "Dota 2": 570};
var appids = {};

appids.tf = appids.tf2 = 440;
appids.cs = appids.csgo = appids.go = 730;
appids.dota = appids.dota2 = appids.dt = appids.dt2 = 570;
appids.steam = appids.stm = 753;
appids.scm = appids.market = 1;

var Search = {
    _req: null,
    _reqcache: {},

    scopes: {},
    apps: {
        ids: appids,
        qualities: appQualities,
        names: appnames
    },
    hints: [],

    request: function (attrs, then) {
        if (this._req) this._req.abort();

        if (typeof then === "function") {
            attrs.onload = function (content) {
                if (attrs.query) {
                    Search.cache(attrs.query, content.responseText);
                }
                then(content.responseText);
            };
        }

        this._req = Script.xhr(attrs);
    },
    cache: function (query, content) {
        var q = this._reqcache;

        if (arguments.length === 1) {
            return q[query];
        }

        if (this._reqcache.hasOwnProperty(query)) {
            return q[query];
        }

        q[query] = content;
        setTimeout(function () { delete q[query]; }, 1000 * 60 * 5);
    },
    // o{fn load; fn render}
    register: function (scope, o) {
        if (!Array.isArray(scope)) scope = [scope];

        scope.forEach(function (name) {
            Search.scopes[name] = o;
        });
    },
    hint: function (title, hint) {
        this.hints.push('<p class="hint-title">' + title + '</p><p class="hint">' + hint + '</p>');
    },
    include: function (o) {
        o.register(Search);
    },
};

function processCustom(query) {
    var parts = query.split(':'),
        scope = parts[0],
        search = parts.splice(1).join(':'),
        handlers = Search.scopes[scope],
        cache = Search.cache(query);

    if (!search || !handlers) return;
    if (cache) {
        handlers.render(cache);
    } else {
        handlers.load(query, scope, search);
    }
}

function checkCustom(query) {
    return query.split(':').length >= 2;
}

function addEventListeners() {
    var inst = Script.window.$('#navbar-search').data('instance'),
        old_showHints = inst.showHints;

    Script.exec('$("#navbar-search").off("keyup");');

    $('#navbar-search').keyup(function() {
        var query = $(this).val().trim();
        if (inst.lastQuery !== query) {
            clearTimeout(inst.timer);
            inst.timer = setTimeout(function () {
                if (checkCustom(query)) processCustom(query);
                else inst.processSearch();
            }, 350);
            inst.lastQuery = query;
        }
    });

    inst.showHints = function () {
        old_showHints.call(inst);
        inst.$dropdown.find('li:nth(1)').append(Search.hints.join(""));
    };

    inst.showHints();
}

function loadScopes() {
    Search.include(require('./searchscopes/scm'));
    Search.include(require('./searchscopes/unusuals'));
    Search.include(require('./searchscopes/classifieds'));
}

function load() {
    loadScopes();
    addEventListeners();
}

module.exports = load;

},{"../script":26,"./searchscopes/classifieds":15,"./searchscopes/scm":16,"./searchscopes/unusuals":17}],15:[function(require,module,exports){
var Pricing = require('../../pricing'),
    Page = require('../../page');
var Search, ec;

function parseTerm(term) {
    var parts = term.split(','),
        iname = parts[0],
        attrs = (parts[1] || "").split('+'),
        params = ['item=' + iname];

    if (attrs[0]) params.push('quality=' + (isNaN(parseInt(attrs[0], 10)) ? (Search.apps.qualities[440].qids[attrs[0].toLowerCase()] || 6) : attrs[0]));
    if (attrs[1]) {
        if (attrs[1].toLowerCase() === 'australium') params.push('australium=1');
    }

    if (parts[2] === '+') params.push('tradable=1'); else if (parts[2] === '-') params.push('tradable=0');
    if (parts[3] === '+') params.push('craftable=1'); else if (parts[3] === '-') params.push('craftable=0');
    return params.join('&');
}

function request(query, scope, search) {
    Search.request({url: 'https://backpack.tf/classifieds?' + parseTerm(search), method: "GET", query: query}, function (response) {
        Pricing.shared(function (e) {
            ec = e;
            ec.scope({step: EconCC.Disabled}, function () {
                render(response);
            });
        });
    });
}

function parse(content) {
    var html = $($.parseHTML(content));
    return html.find('.item').map(function () {
        var img = this.querySelector('.item-icon').style.backgroundImage;
        this.dataset.imgurl = img.substring(img.indexOf('(') + 1, img.indexOf(')'));
        this.dataset.title = this.getAttribute('title');
        return JSON.parse(JSON.stringify(this.dataset));
    }).toArray();
}

function render(content) {
    var searchbox = $('.site-search-dropdown'),
        html = '',
        sections = {},
        section, s, price, ecs, ecc;

    searchbox.empty();
    if (!content) {
        searchbox.append('<li class="header">No matches</li>');
    } else {
        parse(content).forEach(function (data) {
            var colors = Search.apps.qualities[440].qualities[data.qName],
                colorStyle = 'border-color:' + colors[1] + ';background-color:' + colors[0],
                stateClasses = (data.craftable === '1' ? '' : ' nocraft') + (data.tradable === '1' ? '' : ' notrade'),
                sect = sections[data.title],
                price = Pricing.fromListing(ec, data.listingPrice),
                ptag = price.value + ';' + price.currency;

            if (data.listingIntent !== '1') return; // seller
            if (!sect) {
                sect = sections[data.title] = {prices: {}, url: data.listingUrl, states: stateClasses, colors: colorStyle, img: data.imgurl};
            }

            sect.prices[ptag] = (sect.prices[ptag] || 0) + 1;
        });

        for (section in sections) {
            s = sections[section];

            html += '<li class="mini-price"><div class="item-mini"><img src="' + s.img + '"></div><div class="item-name">' + section + '</div><div class="buttons">';
            for (price in s.prices) {
                ecs = price.split(';');
                ecc = {value: ec.convertFromBC(+ecs[0], ecs[1]), currency: ecs[1]};

                html +=
                '<a href="' + s.url + '" class="btn btn-xs classifieds-search-tooltip' + s.states + '" style="' + s.colors + '" title="' + ec.format(ecc, EconCC.Mode.Long) +'">'+
                s.prices[price] + '× ' + ec.format(ecc, EconCC.Mode.Label) + '</a>';
            }
            html += '</div></li>';
        }

        searchbox.append(html);
        Page.addTooltips($('.classifieds-search-tooltip'), '.site-search-dropdown');
    }
}

exports.register = function (s) {
    Search = s;
    s.register(["classifieds", "classified", "cl", "c"], {load: request, render: render});
    s.hint("Classifieds sell orders",
           "Type c: followed by the name of the item. For fine-grained searches, use the item name,quality,tradable,craftable format like Warmer,unique,+,-");
};

},{"../../page":23,"../../pricing":25}],16:[function(require,module,exports){
var Pricing = require('../../pricing'),
    CC = require('../cc'),
    Page = require('../../page');
var Search, ec, cc;

function requestQuery(query, scope, search) {
    var appid = Search.apps.ids[scope];

    if (!appid) return;
    Search.request({query: query, url: searchURL(appid, search), method: "GET"}, parseQuery);
}

function parseQuery(response) {
    var json = JSON.parse(response),
        items = [],
        html;

    if (!json.total_count) {
        return processCustomResults(false);
    }

    html = $($.parseHTML(json.results_html));

    html.filter('.market_listing_row_link').each(function () {
        var $this = $(this);

        items.push({
            img: $this.find('.market_listing_item_img').attr('src'),
            price: $this.find('.market_table_value span:last').text(),
            qty: $this.find('.market_listing_num_listings_qty').text(),
            name: $this.find('.market_listing_item_name').text(),
            url: this.href,
            description: $this.find('.market_listing_game_name').text()
        });
    });

    if (cc) {
        processCustomResults(items);
    } else {
        Pricing.shared(function (e) {
            ec = e;
            CC.init(function (c) {
                cc = c;
                processCustomResults(items);
            });
        });
    }
}

function styleGame(iname, appid) {
    var qualities = Search.apps.qualities[appid],
        q, qname, qreg, i;

    if (!appid || !qualities) return {name: iname};

    for (i in qualities.qualities) {
        qreg = new RegExp("^" + i + " ");
        if (qreg.test(iname)) {
            q = qualities.qualities[i];
            qname = i;
            iname = iname.replace(qreg, "");
            break;
        }
    }

    if (!q) {
        q = qualities.qualities[qualities.defquality];
        qname = qualities.defquality;
    }

    if (!Array.isArray(q)) q = [q, q];

    return {name: iname, style: "background-color:" + q[0] + ";border-color:" + q[1] + ";", qualityName: qname};
}

function processCustomResults(items) {
    var searchbox = $('.site-search-dropdown'),
        results = "",
        descs = {},
        scope = {},
        idesc,
        i, c, low, high;

    function appendres(i) { results += "<li>" + i.html() + "</li>"; }

    searchbox.empty();
    if (!items) {
        return searchbox.html('<li class="header">No results found.</li>');
    }

    for (c = 0; c < items.length; c += 1) {
        i = items[c];
        // 10/10 Steam
        if (i.qty === "0") continue;

        var element = $('<li class="mini-suggestion">'), // for proper styles
            links = $('<div class="buttons">'),
            desc = i.description,
            descid = Search.apps.names[desc],
            styl = styleGame(i.name, descid),
            name = styl.name,
            pricecc = cc.parse(i.price);

        if (!pricecc.matched) {
            searchbox.append('<li class="header">Steam wallet currency unsupported</li>').append('<li><p class="hint">Your Steam wallet currency is not supported by this feature.</p></li>');
            return;
        }

        if (pricecc.alpha !== "USD") {
            low = cc.convert(ec.currencies.usd.low, "USD", pricecc.alpha);
            if (ec.currencies.usd.high) high = cc.convert(ec.currencies.usd.high, "USD", pricecc.alpha);
            scope = {currencies: {usd: {symbol: pricecc.sym, low: low, high: high, pos: {sym: pricecc.trailing ? "end" : "start"}}, metal: {low: low, high: high}}};
        }

        // jshint -W083
        ec.scope(scope, function () {
            links
                .append('<a class="btn btn-default btn-xs scm-search-tooltip" href="' + i.url + '"'+
                        ' title="' + ec.format(ec.scm(ec.parse(pricecc.val + " usd")).seller, EconCC.Mode.Long) + '">' + i.price + '</a>')
                .append('<a class="btn btn-default disabled btn-xs">' + i.qty + ' listed</a>')
            ;
        });

        element
            .append("<div class='item-mini scm-search-tooltip'" + (styl.style ? " style='" + styl.style + "' title='" + styl.qualityName + "'" : "") + ">"+
                    "<img src='" + i.img + "'></div>")
            .append("<div class='item-name'>" + name + "</div>")
            .append(links)
        ;

        descs[desc] = descs[desc] || [];
        descs[desc].push(element);
    }

    for (idesc in descs) {
        results += "<li class='header'>" + idesc + "</li>";
        descs[idesc].forEach(appendres);
    }

    searchbox.html(results);
    Page.addTooltips($('.scm-search-tooltip'), '.site-search-dropdown');
}

function searchURL(appid, query) {
    return 'http://steamcommunity.com/market/search/render/?query=' + encodeURIComponent(query) + (appid === 1 ? '' : '&appid=' + appid) +
        '&currency=1&start=0&count=6';
}

exports.register = function (s) {
    var names = [],
        id;

    Search = s;

    for (id in Search.apps.ids) {
        names.push(id);
    }

    s.register(names, {load: requestQuery, render: parseQuery});
    s.hint("SCM Item Prices", "Type scm:, tf:, cs:, or dt: followed by the name of the item.");
};

},{"../../page":23,"../../pricing":25,"../cc":4}],17:[function(require,module,exports){
var Search, unusualPage;

function request(query, scope, search) {
    if (unusualPage) return render(unusualPage, search);

    Search.request({url: 'https://backpack.tf/unusuals', method: "GET"}, function (response) {
        render(unusualPage = parse(response), search);
    });
}

function parse(content) {
    var html = $($.parseHTML(content));
    return html.find('.item').map(function () {
        var img = this.querySelector('.item-icon').style.backgroundImage;
        this.dataset.imgurl = img.substring(img.indexOf('(') + 1, img.indexOf(')'));
        this.dataset.avg = this.querySelector('.tag.bottom-right').innerText;
        return JSON.parse(JSON.stringify(this.dataset));  // force document garbage collection, saves ~15mb of ram
    }).toArray();
}

function render(unusuals, search) {
    var searchbox = $('.site-search-dropdown'),
        regex = new RegExp(search, "i"),
        html = '',
        matches = [],
        data, i;

    searchbox.empty();
    for (i = 0; i < unusuals.length; i += 1) {
        data = unusuals[i];
        if (regex.test(data.name)) {
            matches.push(data);

            if (matches.length === 10) break;
        }
    }

    if (!matches.length) {
        return searchbox.append('<li class="header">No matches</li>');
    }

    matches.sort(function (a, b) {
        return +b.price - +a.price;
    }).forEach(function (data) {
        var colors = Search.apps.qualities[440].qualities[data.qName],
            colorStyle = 'border-color:' + colors[1] + ';background-color:' + colors[0];

        html +=
        '<li class="mini-price"><div class="item-mini"><img src="' + data.imgurl + '"></div><div class="item-name">' + data.name + '</div><div class="buttons">'+
        '<a href="/unusuals/' + data.name + '" class="btn btn-xs" style="' + colorStyle + '">' + data.avg + '</a>'+
        '<a href="' + data.listingUrl + '" class="btn btn-xs" style="' + colorStyle + '">Classifieds</a>'+
        '</div></li>';
    });

    searchbox.append(html);
}

exports.register = function (s) {
    Search = s;
    s.register(["unusuals", "unusual", "u"], {load: request, render: render});
    s.hint("Unusual price indices", "Type u: followed by the name of the item.");
};

},{}],18:[function(require,module,exports){
var Page = require('../page');

var BadgeSelfMade = {
    title: 'Self-Made User Badge',
    content: 'I made this!',
    style: 'border-color:#3e6527;background-color:#70B04A;box-shadow:inset 0 0 14px #68a046;',
    icon: 'fa-paint-brush'
};

var BadgeSupporter = {
    title: 'Enhancement Suite Supporter',
    content: 'This caring heart donated to the Enhancement Suite project! Thank you!',
    class: 'gold',
    icon: 'fa-trophy',
};

var BadgeHelper = {
    title: 'Collaborator',
    content: 'I helped create Enhancement Suite!',
    style: 'border-color:#ff1ab1;background-color:#ff66cb;box-shadow:inset 0 0 0px #ff1ab1;',
    icon: 'fa-code'
};

var badgemap = [BadgeSelfMade, BadgeSupporter, BadgeHelper];
var ID_PREFIX = "7656119";

function iconinf(item, particle, margins) {
    var o = {
        img: 'url(https://steamcdn-a.akamaihd.net/apps/440/icons/' + item + '.png),url(/images/440/particles/' + particle + '_94x94.png)'
    };

    if (margins) {
        if (typeof margins === 'number') o.lmargin = o.rmargin = margins;
        else {
            o.lmargin = margins[0];
			o.rmargin = margins[1];
        }
    } else {
        o.lmargin = o.rmargin = -4;
    }

    return o;
}

var users = {
    8070299574: {badges: [0], color: '#028482'},
    8039453751: {badges: [1], icon: ['soldier_hat.61b68df2672217c4d2a2c98e3ed5e386a389d5cf', 14, [-4, -4]], font: ["TimesNewRoman, Times New Roman, Times, Baskerville, Georgia, serif"]},
    8068022595: {badges: [1], color: '#f9d200'},
    8107654171: {badges: [1], color: '#0b1c37', icon: ['xms2013_demo_plaid_hat.152c6db9806406bd10fd82bd518de3c89ccb6fad', 58, [-7, -8]]},
    8067575136: {badges: [1], icon: ['xms_pyro_parka.de5a5f80e74f428204a4f4a7d094612173adbe50', 13, [-9, -12]]},
    8044195191: {badges: [1], icon: ['fez.ee87ed452e089760f1c9019526d22fcde9ec2450', 43, [-2, -4]]},
    8056198948: {badges: [1], icon: ['jul13_soldier_fedora.ec4971943386c378e174786b6302d058e4e8627a', 10, [-5, -6]]},
    8165677507: {badges: [1], color: '#FF6000', icon: ['cc_summer2015_potassium_bonnett.3849871e2fe2b96fb41209de62defa59b136f038', 38, [-5, -6]]},
    8067795713: {badges: [1], color: '#000066', icon: ['soldier_warpig.e183081f85b5b2e3e9da1217481685613a3fed1f', 14, [-10, -11]]},
    7980709148: {badges: [1], color: '#A41408'},
    8081201910: {badges: [1], color: '#CC0000', icon: ['hat_first_nr.e7cb3f5de1158e924aede8c3eeda31e920315f9a', 64, [-10, -11]], font: ["Optima, Segoe, Segoe UI, Candara, Calibri, Arial, sans-serif"]},
    8117484140: {badges: [1], color: '#00BBFF', icon: ['medic_ttg_max.5c4b7fcf10ab25fbd166831aea1979395549cb75', 13, [-10, -11]]},
    8005031515: {badges: [1], icon: ['demo_hood.2fa33d5d09dcbfed6345cf927db03c10170b341e', 29, [-2, -5]]},
    8076020691: {badges: [1], color: '#a0d126', icon: ['witchhat_demo.75012466ebcf4d9d81c6d7f75ca646b673114353', 6, [-6, -7]]},
    8048498731: {badges: [2, 0], color: '#9CDF59', icon: ['fall2013_the_cotton_head.38910f84b946d0afdc1b10a2674aa0a0278d822e', 19, [-5, -6]], font: ["Tahoma, Geneva, sans-serif"]},
    8080179568: {badges: [2], icon: ['tooth_hat.c2014cb6315e2ce880058cdcd0a7569056b11260', 10, [-5, -6]]},
	};

function renderUserBadges(badges) {
    var html = '';

    badges.forEach(function (n) {
        var badge = badgemap[n];

        html += '<div data-title="' + badge.title + '" data-content="' + badge.content + '"'+
            ' class="user-badge bes-badge' + (badge.class ? ' ' + badge.class : '') + '"' + (badge.style ? ' style="' + badge.style + '"' : "") + '>'+
            '<i class="fa ' + badge.icon + '"></i></div>';
    });

    $('.user-badge-list .user-badge:last').after(html);
}

function badgePopovers() {
    $('.user-badge.bes-badge').popover({html: true, trigger: 'hover', placement: 'bottom'});
}

function changeUserColors(handle) {
    $('user-link').each(function () {
        var id = this.dataset.id || "",
            u = users[id.substr(ID_PREFIX.length)];

        if (!u || (!u.color && !u.font)) return;

        this.style.fontWeight = '700';
        this.style.setProperty('color', u.color, 'important');
        
        if (u.font){
        this.style.setProperty('font-family', u.font);
        }
    });
}

function modifyBelts(handle) {
    $('user-link').each(function () {
        var id = this.dataset.id || "",
            u = users[id.substr(ID_PREFIX.length)],
            icon, belt, padding, lmargin, rmargin;

        if (!u || !u.icon) return;
        icon = iconinf.apply(null, u.icon);
        belt = this.querySelector('.label-belt');
        belt = this.querySelector('.belt');
        if (!belt) return;

        padding = icon.padding || 14;
        if (icon.margin) lmargin = rmargin = icon.margin;
        if (icon.lmargin) lmargin = icon.lmargin;
        if (icon.rmargin) rmargin = icon.rmargin;

        belt.innerHTML = '<span style="background-image:' + icon.img + ';background-size:contain;background-repeat:no-repeat;padding:' + padding + 'px;margin-left:' + lmargin + 'px;margin-right:' + rmargin + 'px;text-shadow:none;color: transparent;">★</span>';

    });
}

function load() {
    var handle = Page.users(),
        user;

    // Name colors
    if (handle.length && location.pathname !== '/donate') {
        changeUserColors(handle);
    }

    modifyBelts(handle);

    // User badges
    if (!Page.isProfile()) return;

    user = users[Page.profileSteamID().substr(ID_PREFIX.length)];
    if (!user || !user.badges) return;

    renderUserBadges(user.badges);
    badgePopovers();
}

module.exports = load;

},{"../page":23}],19:[function(require,module,exports){
exports.setItem = function (name, value) {
    return GM_setValue(name, value);
};

exports.getItem = function (name) {
    var lsItem = localStorage.getItem(name);

    // Migrate to GM storage for cross subdomain storage
    if (lsItem) {
        GM_setValue(name, lsItem);
        localStorage.removeItem(name);
        return lsItem;
    }

    return GM_getValue(name);
};

exports.removeItem = function (name) {
    return GM_deleteValue(name);
};

},{}],20:[function(require,module,exports){
var DataStore = require('../datastore'),
    Script = require('../script');

function Key(field, loadconf, done) {
    this.field = field;
    this.loadconf = loadconf;
    this.done = done;
    this.key = '';

    Key.keys.push(this);
}

Key.prototype.register = function () {throw new Error('abstract method register not reimplemented');};
Key.prototype.extract = function (/*text*/) {throw new Error('abstract method extract not reimplemented');};

Key.prototype.obtain = function () {
    var self = this;
    Script[this.loadconf.method || "GET"](this.loadconf.url, function (body) {
        var key = self.extract(body);

        if (key) {
            self.set(key);
            self.ready();
        } else {
            self.register();
        }
    });
};

Key.prototype.set = function (key) {
    if (!key) return;

    this.key = key;
    DataStore.setItem(this.field, key);
};

Key.prototype.remove = function () {
    this.key = '';
    DataStore.removeItem(this.field);
};

Key.prototype.ready = function () {
    this.done();
};

Key.prototype.load = function () {
    var storedkey = DataStore.getItem(this.field);

    if (storedkey) {
        this.key = storedkey;
        this.ready();
    } else {
        this.obtain();
    }
};

Key.keys = [];
module.exports = Key;

},{"../datastore":19,"../script":26}],21:[function(require,module,exports){
function Queue() {
    this.queue = [];
    this.busy = false;
}

Queue.prototype.enqueue = function () {
    var args = arguments,
        self = this;

    this.queue.push(function () {
        self.exec.apply(self, args);
    });

    if (this.canProceed() && !this.busy) {
        this.next();
    }
};

Queue.prototype.next = function () {
    if (this.busy) return;
    var next = this.queue.shift();

    if (next) {
        this.busy = true;
        next();
    }
};

Queue.prototype.exec = function () {throw new Error('abstract method exec not reimplemented');};
Queue.prototype.canProceed = function () { return true; };
Queue.prototype.done = function () {
    this.busy = false;
    this.next();
};

module.exports = Queue;

},{}],22:[function(require,module,exports){
var Page = require('./page');
var actions = [];

exports.addAction = function (obj) {
    actions.push(obj);
    if (Page.loaded) exports.applyActions();
    return this;
};

exports.applyActions = function () {
    if (!Page.loggedIn()) return;
    if (!actions.length) return;

    if (!document.getElementById('bp-custom-actions')) {
        $('.navbar-profile-nav .dropdown-menu a[href="/donate"]').parent().find('+ .divider') // Fix for mods
            .after('<li class="divider" id="bp-custom-actions"></li>');
    }

    var html = "";
    actions.forEach(function (action) {
        html += '<li><a href="#" id="' + action.id + '"><i class="fa fa-fw ' + action.icon + '"></i> ' + action.name + '</a></li>';
    });

    $('#bp-custom-actions').before(html);
    actions.forEach(function (action) {
        document.getElementById(action.id).addEventListener('click', function (e) {
            e.preventDefault();
            action.click.call(this);
        }, false);
    });

    actions = [];
};

},{"./page":23}],23:[function(require,module,exports){
var Script = require('./script');

// Suite stuff

var nonNumerical = /\D/g;

var state = {
    ownid: "",
    profile: false,
    backpack: false,
    ownprofile: false,
    ownbackpack: false,
    steamid: "",
    loggedin: false,
    token: "",
    appid: 0,
    indexpage: false,
    loaded: false,
    handles: {}
};

function getter(name, val) {
    exports[name] = function () { return state[val]; };
}

exports.init = function () {
    var menu = $('.navbar-profile-nav .dropdown-menu');
    state.steamid = $('.profile .avatar-container a')[0] || "";
    state.loggedin = menu.length;

    if (state.steamid) {
        state.profile = true;
        state.backpack = state.profile && !!document.getElementById('backpack');
        state.steamid = state.steamid.href.replace(nonNumerical, '');
    }

    if (state.loggedin) {
        state.ownid = menu.find('.fa-briefcase').parent().attr('href').replace(nonNumerical, '');
        if (state.profile) {
            state.ownprofile = state.ownid === state.steamid;
        }

        state.token = Script.window.userID || menu.find('.fa-sign-out').parent().attr('href').replace(/(.*?=)/, '');
        state.ownbackpack = state.ownprofile && state.backpack;
    }

    state.indexpage = location.pathname === '/';

    state.appid = 440;
    if (location.hostname.indexOf("dota2") !== -1) state.appid = 570;
    else if (location.hostname.indexOf("csgo") !== -1) state.appid = 730;
    state.handles = $('.handle');
};

exports.state = state;

getter('isProfile', 'profile');
getter('isBackpack', 'backpack');
getter('profileSteamID', 'steamid');
getter('loggedIn', 'loggedin');
getter('userSteamID', 'ownid');
getter('isUserProfile', 'ownprofile');
getter('isUserBackpack', 'ownbackpack');
getter('csrfToken', 'token');
getter('appid', 'appid');
getter('isIndexPage', 'indexpage');
getter('ready', 'loaded');
getter('users', 'handles');

exports.escapeHtml = function (message) {
    return $('<span>').text(message).text().replace(/"/g, "&quot;").replace(/'/g, "&apos;");
};

exports.addStyle = function (css) {
    var style = document.createElement('style');
    style.textContent = css;
    (document.head || document.body || document.documentElement).appendChild(style);
};

exports.$id = function (id) { return document.getElementById(id); };

exports.SUITE_VERSION = GM_info.script.version;

// Page stuff/userscript fixes

exports.addTooltips = function (elem, container) {
    if (!elem) elem = $("[data-suite-tooltip]");
    elem.tooltip({container: container || 'body'});
};

// handlers{fn(id)|str content, fn(id)|str placement, fn(id) show, fn(id) hide}
// fn is bound to this, remember to wrap strings in ""
// if content/placement is str, variable elem refers to the element
exports.addPopovers = function (item, container, handlers) {
    item.mouseenter(function () {
        var $this = $(this);
        if ($this.parent().hasClass('item-list-links')) {
            return;
        }

        function next(fn) {
            var content, placement;
            fn = fn || {};

            content = typeof fn.content === "function" ? fn.content.call($this) : fn.content;
            placement = typeof fn.placement === "function" ? fn.placement.call($this) : fn.placement;

            $this.popover({animation: false, html: true, trigger: "manual", placement: placement, content: content});
            setTimeout(function () {
                if ($this.filter(':hover').length) {
                    $(".popover").remove();
                    $this.popover("show");
                    $this[0].style.padding = 0;
                    if (fn.show) fn.show.call($this);
                }
            }, fn.delay || 0);
        }

        if (handlers.next) handlers.next.call($this, next);
        else next(handlers);
    }).mouseleave(function () {
        var $this = $(this);
        setTimeout(function () {
            if (!$this.filter(':hover').length && !$('.popover:hover').length) {
                $this.popover("hide");
                if (handlers.hide) handlers.hide.call($this);
            }
        }, 100);
    }).on('shown.bs.popover', function () {
        Script.exec("$('.popover-timeago').timeago();");
    });

    if (container) {
        container.on('mouseleave', '.popover', function () {
            var $this = $(this);

            setTimeout(function() {
                if (!$this.is(':hover')) {
                    $this.remove();
                }
            }, 300);
        });
    }

    return item;
};

exports.addItemPopovers = function (item, container) {
    exports.addPopovers(item, container, {
        content: function () { return Script.window.createDetails(this); },
        placement: function () { return Script.window.get_popover_placement; },
        show: function () {
            var ds = this[0].dataset,
                di = ds.defindex,
                dq = ds.quality,
                dpi = ds.priceindex,
                dc = +!ds.craftable,
                da = ds.app;

            $('#search-bazaar').click(function () {
                window.searchBazaar(di, dq, dpi, dc, da);
            });

            $('#search-outpost').click(function () {
                window.searchOutpost(di, dq, dpi, dc, da);
            });

            $('#search-lounge').click(function() {
                window.searchLounge(di, dq);
            });
        }
    });
};

// don't pass html to return just an icon stack
exports.addItemIcon = function (el, html) {
    var elem = $(el),
        stack = elem.find('.icon-stack');

    if (!stack.length) {
        elem.append('<div class="icon-stack"></div>');
        stack = elem.find('.icon-stack');
    }

    if (!html) return stack;
    return stack.append(html);
};

exports.modal = function () { return Script.window.modal.apply(Script.window, arguments); };
exports.hideModal = function () {
    $("#active-modal, .modal-backdrop").remove();
};

exports.bp = function () { return Script.window.backpack; };
exports.selectItem = function (e) { e.removeClass('unselected'); };
exports.unselectItem = function (e) { e.addClass('unselected'); };

},{"./script":26}],24:[function(require,module,exports){
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

},{"./datastore":19}],25:[function(require,module,exports){
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
    if (typeof price !== 'string') return {value: 0, currency: null};
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
    if (typeof price !== 'string') return {value: 0, currency: null};
    var val = ec.parse(price);

    return {value: ec.convertToBC(val), currency: val.currency};
};

},{"./api":2,"./preferences":24}],26:[function(require,module,exports){
var counter = 0;

/* jshint -W061 */
exports.exec = function (code) {
    return window.eval(code);
};

exports.window = unsafeWindow;

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

},{}]},{},[1]);
