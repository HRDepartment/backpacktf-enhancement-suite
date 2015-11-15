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
