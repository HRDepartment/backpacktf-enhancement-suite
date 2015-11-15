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
    if (clear && Page.bp()) {
        Script.exec('$(".item").removeData("price");');
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
