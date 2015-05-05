var Prefs = require('../preferences'),
    Page = require('../page'),
    Pricing = require('../pricing'),
    MenuActions = require('../menu-actions');

var period = Prefs.pref('changes', 'period'), // ms
    now = moment(),
    changes = [],
    ec;

function priceInPeriod(price) {
    var mom = moment.unix(price.last_update);
    return now.diff(mom) <= period;
}

function applyArrows() {
    // TODO: cleverness regarding DI
    changes.forEach(function (change) {
        var elem = change[0],
            price = change[1],
            stack = elem.find('.icon-stack'),
            value = {low: Math.abs(price.difference), currency: 'metal'},
            mode = EconCC.Mode.Label,
            diff, icon;

        if (!stack.length) {
            elem.append('<div class="icon-stack"></div>');
            stack = elem.find('.icon-stack');
        }

        if (price.difference === 0) {
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

        stack.append("<div class='price-arrow'><i class='" + icon + "' title='" + diff + "' data-suite-tooltip></i></div>");
    });
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
    Page.addTooltips(clones.find('[data-suite-tooltip]'), '#change-cloned');
}

function addMenuAction() {
    MenuActions.addAction({
        name: 'Recent Price Changes',
        icon: 'fa-calendar',
        id: 'bp-recent-changes',
        click: onMenuActionClick
    });
}

function findChanges(pricelist) {
    $('.item:not(.spacer)').each(function () {
        var $this = $(this),
            item = pricelist.items[$this.data('name')],
            price, series;

        if (!item) return;
        price = item.prices[+($this.data('quality'))];
        if (!price) return;
        price = price[$this.data('tradable') ? "Tradable" : "Non-Tradable"];
        if (!price) return;
        price = price[$this.data('craftable') ? "Craftable" : "Non-Craftable"];
        if (!price) return;

        if (price[0]) {
            price = price[0];
            if (priceInPeriod(price)) {
                changes.push([$this, price]);
            }
        } else {
            if ((series = $this.data('crate')) || (series = $this.data('priceindex'))) {
                price = price[series];
                if (price && priceInPeriod(price)) {
                    changes.push([$this, price]);
                }
            }
        }
    });
}

function load() {
    if (Page.appid() !== 440) return; // Sorry Dota
    if (!Page.isBackpack()) return;

    Pricing.ec(function (inst, pricelist) {
        ec = inst;
        findChanges(pricelist);
        applyArrows();
        addMenuAction();
    });
}

module.exports = load;
