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

    items.each(function () {
        var $this = $(this),
            ds = this.dataset,
            di = ds.defindex,
            listing = ds.listingSteamid,
            eq = $this.find('.equipped'),
            mults = 0,
            s = {},
            o;

        if (!ds.pBptf) return;

        var price = listing ? Pricing.fromListing(ec, ds.listingPrice) : Pricing.fromBackpack(ec, ds.pBptf),
            value = price.value,
            currency = price.currency;

        if (!listing) {
            mults = modmults(this);
            if (mults !== 0) {
                value += mults * modmult;

                clear = true;
                ds.price = value;
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

        if (mults || !pricedef) {
            ec.scope(s, function () {
                var f;

                // Exception for keys
                if (di === '5021') f = ec.formatCurrency(o);
                else f = ec.format(o, EconCC.Mode.Label).replace('.00', '');

                eq.html((listing ? '<i class="fa fa-tag"></i> ' : '~') + f);
            });
        }

        if (tooltips && /key/.test(currency)) {
            ec.scope(s, function () {
                eq.attr('title', ec.format(o, EconCC.Mode.Long)).attr('data-suite-tooltip', '').addClass('pricetags-tooltip');
            });
        }
    });

    // Clear price cache for updateValues()
    if (clear && Page.bp()) {
        Script.exec('$("' + items.selector + '").removeData("price");');
        Page.bp().updateValues();
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

    items = $('.item:not([data-vote])');
    if (!items.length) return;

    setupInst(function () {
        ec.scope({currencies: {metal: {trailing: EconCC.Disabled}}}, function () {
            applyTagsToItems(items);
        });
    });
}

module.exports = load;

module.exports.setupInst = setupInst;
module.exports.applyTagsToItems = applyTagsToItems;
module.exports.enabled = enabled;
