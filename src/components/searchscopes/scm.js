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
