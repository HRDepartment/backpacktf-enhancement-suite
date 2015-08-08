var Script = require('../script'),
    Pricing = require('../pricing'),
    CC = require('./cc'),
    Page = require('../page');

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

var descids = {"Team Fortress 2": 440, "Counter-Strike: Global Offensive": 730, "Dota 2": 570};
var appids = {},
    reqcache = {},
    req, ec, cc;

appids.tf = appids.tf2 = 440;
appids.cs = appids.csgo = appids.go = 730;
appids.dota = appids.dota2 = appids.dt = appids.dt2 = 570;
appids.scm = appids.market = appids.steam = 1;

function makeRequest(url, done, query) {
    if (req) req.abort();

    req = GM_xmlhttpRequest({
        method: "GET",
        url: url,
        onload: function (content) {
            var json = JSON.parse(content.responseText);
            done(json, query);
        }
    });
}

function parseClassifiedsTerm(term) {
    var parts = term.split(','),
        iname = parts[0],
        attrs = (parts[1] || "").split('+'),
        params = ['item=' + iname],
        qid;

    if (attrs[0]) params.push('quality=' + (isNaN(parseInt(attrs[0], 10)) ? (appQualities[440].qids[attrs[0].toLowerCase()] || 6) : attrs[0]));
    if (attrs[1]) {
        if (attrs[1].toLowerCase() === 'australium') params.push('australium=1');
    }

    if (parts[2] === '+') params.push('tradable=1'); else if (parts[2] === '-') params.push('tradable=0');
    if (parts[3] === '+') params.push('craftable=1'); else if (parts[3] === '-') params.push('craftable=0');
    return params.join('&');
}

function classifiedsRequest(term, query) {
    if (req) req.abort();

    req = GM_xmlhttpRequest({
        method: "GET",
        url: 'https://backpack.tf/classifieds?' + parseClassifiedsTerm(term),
        onload: function (content) {
            reqcache[query] = content.responseText;
            setTimeout(function () { delete reqcache[query]; }, 1000 * 60 * 5);

            Pricing.shared(function (e) {
                ec = e;
                ec.scope({step: EconCC.Disabled}, function () {
                    processClassifieds(content.responseText);
                });
            });
        }
    });
}

function parseClassifieds(content) {
    var html = $($.parseHTML(content));
    return html.find('.item').map(function () {
        var img = this.querySelector('.item-icon').style.backgroundImage;
        this.dataset.imgurl = img.substring(img.indexOf('(') + 1, img.indexOf(')'));
        this.dataset.title = this.getAttribute('title');
        return this.dataset;
    }).toArray();
}

function processClassifieds(content) {
    var searchbox = $('.site-search-dropdown'),
        html = '',
        sections = {},
        section, s, price, ecs, ecc;

    searchbox.empty();
    if (!content) {
        searchbox.append('<li class="header">No matches</li>');
    } else {
        parseClassifieds(content).forEach(function (data, index) {
            var colors = appQualities[440].qualities[data.qName],
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
                s.prices[price] + '× ' + ec.format(ecc, EconCC.Mode.Label) + '</a>'
            }
            html += '</div></li>';
        }

        searchbox.append(html);
        Page.addTooltips($('.classifieds-search-tooltip'), '.site-search-dropdown');
    }
}

function parseQuery(json, query) {
    var html, items;

    if (!json.total_count) {
        return processCustomResults(false);
    }

    html = $($.parseHTML(json.results_html));
    items = [];

    html.filter('.market_listing_row_link').each(function () {
        var $this = $(this);

        items.push({
            img: $this.find('.market_listing_item_img').attr('src'),
            price: $this.find('.market_table_value span:first').text(),
            qty: $this.find('.market_listing_num_listings_qty').text(),
            name: $this.find('.market_listing_item_name').text(),
            url: this.href,
            description: $this.find('.market_listing_game_name').text()
        });
    });

    if (query) {
        reqcache[query] = items;
        setTimeout(function () { reqcache[query] = null; }, 1000 * 60 * 5);
    }

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
    var qualities = appQualities[appid],
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
        results = $("<ul>"),
        descs = {},
        idesc;

    function appendres(i) { results.append(i); }

    searchbox.show();
    if (items) {
        items.forEach(function (i) {
            // 10/10 Steam
            if (i.qty === "0") return;

            var element = $('<li class="mini-suggestion">'), // for proper styles
                links = $('<div class="buttons">'),
                desc = i.description,
                descid = descids[desc],
                styl = styleGame(i.name, descid),
                name = styl.name,
                pricecc = cc.parse(i.price);

            if (!pricecc.matched) {
                searchbox.append('<li class="header">Steam wallet currency unsupported</li>').append('<li><p class="hint">Your Steam wallet currency is not supported by this feature.</p></li>');
                return;
            }

            i.price = "$" + cc.convertToBase(pricecc.val, pricecc.alpha).toFixed(2);

            links
                .append('<a class="btn btn-default btn-xs scm-search-tooltip" href="' + i.url + '"'+
                        ' title="' + ec.format(ec.scm(ec.parse(i.price)).seller, EconCC.Mode.Long) + '">' + i.price + '</a>')
                .append('<a class="btn btn-default disabled btn-xs">' + i.qty + ' listed</a>')
            ;

            element
                .append("<div class='item-mini scm-search-tooltip'" + (styl.style ? " style='" + styl.style + "' title='" + styl.qualityName + "'" : "") + ">"+
                        "<img src='" + i.img + "'></div>")
                .append("<div class='item-name'>" + name + "</div>")
                .append(links)
            ;

            descs[desc] = descs[desc] || [];
            descs[desc].push(element);
        });

        for (idesc in descs) {
            results.append("<li class='header'>" + idesc + "</li>");
            descs[idesc].forEach(appendres);
        }
    } else {
        results.append('<li class="header">No results found.</li>');
    }

    searchbox.html(results.html());
    Page.addTooltips($('.scm-search-tooltip'), '.site-search-dropdown');
}

function searchURL(appid, query) {
    return 'http://steamcommunity.com/market/search/render/?query=' + encodeURIComponent(query) + (appid === 1 ? '' : '&appid=' + appid) +
        '&currency=1&start=0&count=6';
}

function processCustom(query) {
    var parts = query.split(':'),
        scope = parts[0],
        search = parts.splice(1).join(':'),
        appid = appids[scope];

    if (!search) return;

    if (scope === 'classified' || scope === 'classifieds' || scope === 'cl') {
        if (reqcache.hasOwnProperty(query)) processClassifieds(reqcache[query]);
        else classifiedsRequest(search, query);
        return;
    }

    if (!appid) return;

    if (reqcache[query]) processCustomResults(reqcache[query]);
    else makeRequest(searchURL(appid, search), parseQuery, query);
}

function checkCustom(query) {
    return query.split(':').length >= 2;
}

function addEventListeners() {
    var inst = unsafeWindow.$('#navbar-search').data('instance');

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
}

function load() {
    addEventListeners();
}

module.exports = load;
