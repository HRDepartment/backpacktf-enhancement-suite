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
        unsafeWindow.updateFormState();
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
        var clone = this.cloneNode(true);
        clone.classList.add('classifieds-clone');

        if (clone.dataset.listingIntent === '0') {
            buyers.push(clone);
        } else if (clone.dataset.listingIntent === '1') {
            sellers.push(clone);
        }

        if (autofillEnabled) {
            clone.dataset.listingAutomatic = !!$(this).closest('.media.listing').find('.fa-flash').length;
        }
    });

    if (sellers.length) {
        $ppb.append('<h5>Sellers</h5><div id="classifieds-sellers" class="row"></div>');
        $("#classifieds-sellers").html(sellers);
    }

    if (buyers.length) {
        $ppb.append('<h5>Buyers</h5><div id="classifieds-buyers" class="row"></div>');
        $("#classifieds-buyers").html(buyers);
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
    e.preventDefault();

    $.ajax({
        method: "GET",
        url: $('.item').data('listing-url'),
        dataType: "html"
    }).success(peekload);
}

function add(sig) {
    var htm =
        '<div class="row"><div class="col-md-12 "><div class="panel panel-main" id="peek-panel">'+
        '<div class="panel-heading">Classifieds <span class="pull-right"><small><a href="#" id="classifieds-peek">Peek</a></small></span></div>'+
        '</div></div></div></div>';
    var signature = Prefs.pref('classifieds', sig),
        $details = $("#details");

    $('#page-content .row:eq(1)').before(htm);
    $("#classifieds-peek").one('click', peek);

    if (!$details.val().length) {
        $details.val(signature);
        Script.exec('$("#details").trigger("blur");');
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

        unsafeWindow.updateFormState();
    });
}

function buy() {
    add('signature-buy');
}

function sell() {
    add('signature');
    addAutofill();
}

function checkAutoclose() {
    if (Prefs.pref('classifieds', 'autoclose') &&
        /Your listing was posted successfully/.test($('.alert-success').text())) {
        window.close();
    }
}

function global() {
    if ($('.listing-remove').length) addRemoveAllListings();
}

function load() {
    var pathname = location.pathname;

         if (pathname.match(/\/classifieds\/buy\/.{1,}\/.{1,}\/.{1,}\/.{1,}\/?.*/)) buy();
    else if (pathname.match(/\/classifieds\/relist\/.{1,}/)) buy();
    else if (pathname.match(/\/classifieds\/sell\/.{1,}/)) sell();
    else if (pathname === '/classifieds' || pathname === '/classifieds/') checkAutoclose();
    global();
}

module.exports = load;
