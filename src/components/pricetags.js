var Page = require('../page'),
    Prefs = require('../preferences'),
    Pricing = require('../pricing'),
    Script = require('../script');
var KEY_PRICE = 2.49;
var ec, sec;

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

        if (Prefs.pref('pricetags', 'correctscm')) {
            Pricing.ec(function (ins) {
                var refprice = KEY_PRICE / ins.convertToCurrency({value: 1, currency: 'keys'}, 'metal').value;
                sec = ins;
                sec.modify({
                    currencies: {
                        usd: {low: refprice, high: undefined, hidden: true},
                        metal: {low: refprice, high: undefined, trailing: EconCC.Disabled}
                    }
                });
                next();
            });
        } else next();
    });
}

function applyTagsToItems(items) {
    var modmult = Prefs.pref('pricetags', 'modmult'),
        tooltips = Prefs.pref('pricetags', 'tooltips'),
        correctscm = Prefs.pref('pricetags', 'correctscm'),
        pricedef = Pricing.default(),
        clear = false;

    items.each(function () {
        var $this = $(this),
            ds = this.dataset,
            di = ds.defindex,
            listing = ds.listingSteamid,
            scmPrice = !listing && !ds.pBptfAll && !!ds.pScmAll,
            eq = $this.find('.equipped'),
            iprice = ds.pBptf || ds.pScm,
            mults = 0,
            s = {},
            inst = ec,
            o;

        if (!iprice) return;

        var price = listing ? Pricing.fromListing(ec, ds.listingPrice) : Pricing.fromBackpack(ec, ds.pBptf),
            value = price.value,
            currency = price.currency,
            scmprice, scmvalue, scmcurrency, v, vc;

        if (correctscm && ds.pScm) {
            scmprice = Pricing.fromBackpack(sec, ds.pScm);
            scmvalue = scmprice.value;
            scmcurrency = 'metal';

            if (scmvalue > sec.currencies.keys.low) {
                scmprice = sec.convertToCurrency(scmprice, 'keys');
                scmcurrency = scmprice.currency;
            }

            if (scmPrice) inst = sec;
        }

        if (correctscm && scmPrice) {
            v = scmvalue;
            vc = scmcurrency;
        } else {
            v = value;
            vc = currency;
        }

        if (!listing) {
            mults = modmults(this);
            if (mults !== 0) {
                v += mults * modmult;

                clear = true;
                ds.price = v;
            }

            if (mults || !pricedef) {
                clear = true;
                ds.price = v;
            }
        }

        v = inst.convertFromBC(v, vc);
        // TODO: fix in econcc
        if (vc === 'usd') {
            v *= inst.valueFromRange(inst.currencies.metal).value;
        }

        if (value && currency) {
            value = ec.convertFromBC(value, currency);
            if (currency === 'usd') {
                value *= ec.valueFromRange(ec.currencies.metal).value;
            }
        }

        if (scmvalue) {
            scmvalue = sec.convertFromBC(scmvalue, scmcurrency);
            if (scmcurrency === 'usd') {
                scmvalue *= sec.valueFromRange(sec.currencies.metal).value;
            }
        }

        o = {value: v || 0.001, currency: vc};

        // Disable step for listings
        if (listing) s = {step: EconCC.Disabled};
        else if (inst.step === EconCC.Enabled) s = {currencies: {keys: {round: 1}}};

        if ((!scmPrice && (mults || !pricedef)) || (scmPrice && correctscm)) {
            inst.scope(s, function () {
                var f;

                // Exception for keys
                if (di === '5021') f = inst.formatCurrency(o);
                else f = inst.format(o, EconCC.Mode.Label).replace('.00', '');

                eq.html((listing ? '<i class="fa fa-tag"></i> ' : '~') + f);
            });
        }

        if (correctscm && ds.pScmAll) {
            ds.pScmAll = sec.format({value: scmvalue, currency: scmcurrency}, EconCC.Mode.Long).replace(' (', ', ').replace(')', '');
        }

        if (tooltips && /key/.test(currency)) {
            inst.scope(s, function () {
                eq.attr('title', inst.format(o, EconCC.Mode.Long)).attr('data-suite-tooltip', '').addClass('pricetags-tooltip');
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
        Prefs.pref('pricetags', 'correctscm') !== false ||
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
