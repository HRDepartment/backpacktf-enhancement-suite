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

    function addIcon(el) {
        var elem = $(el),
            stack = elem.find('.icon-stack');

        if (!stack.length) {
            elem.append('<div class="icon-stack"></div>');
            stack = elem.find('.icon-stack');
        }

        stack.append(html);
    }

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
            html += "<div class='arrow-icon'><i class='" + icon + " change-tooltip' title='" + diff + "'></i></div>";
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

    elems = $('.price-arrow').parent().parent().filter(function () {
        var di = $(this).attr('data-defindex');
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

    unsafeWindow.modal("Recent Price Changes", container.html()); // Firefox support, .html()

    clones = $('.change-clone'); // FF support
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
    if (Page.appid() !== 440) return; // Sorry Dota
    if (!Page.isBackpack()) return;

    API.IGetPrices(function (pricelist) {
        Pricing.shared(function (inst) {
            ec = inst;
            addMenuAction();
            applyChanges(pricelist);
        });
    });
}

module.exports = load;
