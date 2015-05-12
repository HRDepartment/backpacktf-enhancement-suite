var Prefs = require('./preferences'),
    API = require('./api');

exports.ec = function (cb) {
    API.IGetPrices(function (pricelist) {
        API.IGetCurrencies(function (currencies) {
            var ec = new EconCC(currencies, pricelist);
            ec.step = Prefs.pref('pricing', 'step');
            ec.range = Prefs.pref('pricing', 'range');
            delete ec.currencies.earbuds;

            cb(ec, pricelist, currencies);
        });
    });
};

exports.default = function () {
    return Prefs.pref('pricing', 'step') === EconCC.Disabled && Prefs.pref('pricing', 'range') === EconCC.Range.Mid;
};

exports.fromListing = function (ec, price) {
    var parts = price.split(', '),
        bc = 0,
        hv = 0,
        mainc;

    parts.forEach(function (part) {
        var p = part.split(' '),
            price = +p[0],
            currency = p[1],
            v = ec.convertToBC(price, currency);

        if (v > hv) {
            hv = v;
            mainc = currency;
        }

        bc += v;
    });

    return {value: bc, currency: mainc};
};

exports.fromBackpack = function (ec, price) {
    var parts = price.split(" "),
        val = parts[0].split(/-|–/), // en dash, dash for ref (10/10)
        currency = parts[1],
        bc = 0;

    if (val[0][0] === '$') {
        val[0] = val[0].substr(1);
        currency = 'usd';
    }

    bc = ec.convertToBC(ec.valueFromRange({low: +val[0], high: +val[1], currency: currency}), currency);
    return {value: bc, currency: currency};
};

exports.unufx = {"Green Confetti":6,"Purple Confetti":7,"Haunted Ghosts":8,"Green Energy":9,"Purple Energy":10,"Circling TF Logo":11,"Massed Flies":12,"Burning Flames":13,"Scorching Flames":14,"Searing Plasma":15,"Vivid Plasma":16,"Sunbeams":17,"Circling Peace Sign":18,"Circling Heart":19,"Stormy Storm":29,"Blizzardy Storm":30,"Nuts n' Bolts":31,"Orbiting Planets":32,"Orbiting Fire":33,"Bubbling":34,"Smoking":35,"Steaming":36,"Flaming Lantern":37,"Cloudy Moon":38,"Cauldron Bubbles":39,"Eerie Orbiting Fire":40,"Knifestorm":43,"Misty Skull":44,"Harvest Moon":45,"It's A Secret To Everybody":46,"Stormy 13th Hour":47,"Attrib_Particle55":55,"Kill-a-Watt":56,"Terror-Watt":57,"Cloud 9":58,"Aces High":59,"Dead Presidents":60,"Miami Nights":61,"Disco Beat Down":62,"Phosphorous":63,"Sulphurous":64,"Memory Leak":65,"Overclocked":66,"Electrostatic":67,"Power Surge":68,"Anti-Freeze":69,"Time Warp":70,"Green Black Hole":71,"Roboactive":72,"Arcana":73,"Spellbound":74,"Chiroptera Venenata":75,"Poisoned Shadows":76,"Something Burning This Way Comes":77,"Hellfire":78,"Darkblaze":79,"Demonflame":80,"Bonzo The All-Gnawing":81,"Amaranthine":82,"Stare From Beyond":83,"The Ooze":84,"Ghastly Ghosts Jr":85,"Haunted Phantasm Jr":86,"Showstopper":3001,"Holy Grail":3003,"'72":3004,"Fountain of Delight":3005,"Screaming Tiger":3006,"Skill Gotten Gains":3007,"Midnight Whirlwind":3008,"Silver Cyclone":3009,"Mega Strike":3010,"Haunted Phantasm":3011,"Ghastly Ghosts":3012,"Frostbite":87,"Molten Mallard":88,"Morning Glory":89,"Death at Dusk":90};
