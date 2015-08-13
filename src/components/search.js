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
appids.scm = appids.market = appids.steam = 1;

var Search = {
    _req: null,
    _reqcache: {},

    scopes: {},
    apps: {
        ids: appids,
        qualities: appQualities,
        names: appnames
    },

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

        this._req = GM_xmlhttpRequest(attrs);
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

function loadScopes() {
    Search.include(require('./searchscopes/scm'));
    Search.include(require('./searchscopes/classifieds'));
    Search.include(require('./searchscopes/unusuals'));
}

function load() {
    loadScopes();
    addEventListeners();
}

module.exports = load;
