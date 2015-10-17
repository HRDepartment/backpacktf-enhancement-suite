var Page = require('../page');

var BadgeSelfMade = {
    title: 'Self-Made User Badge',
    content: 'I made this!',
    style: 'border-color:#3e6527;background-color:#70B04A;box-shadow:inset 0 0 14px #68a046;',
    icon: 'fa-paint-brush'
};

var BadgeSupporter = {
    title: 'Enhancement Suite Supporter',
    content: 'This caring heart donated to the Enhancement Suite project! Thank you!',
    class: 'gold',
    icon: 'fa-trophy',
};

var badgemap = [BadgeSelfMade, BadgeSupporter];
var ID_PREFIX = "7656119";

function iconinf(item, particle, margins) {
    var o = {
        img: 'url(https://steamcdn-a.akamaihd.net/apps/440/icons/' + item + '.png),url(/images/440/particles/' + particle + '_94x94.png)'
    };

    if (margins) {
        if (typeof margins === 'number') o.lmargin = o.rmargin = margins;
        else {
            o.lmargin = margins[0];
            o.rmargin = margins[1];
        }
    } else {
        o.lmargin = o.rmargin = -4;
    }

    return o;
}

var users = {
    8070299574: {badges: [0], color: '#028482'},
    8039453751: {badges: [1], icon: ['soldier_hat.61b68df2672217c4d2a2c98e3ed5e386a389d5cf', 14, [-4, -4]]},
    8068022595: {badges: [1], color: '#f9d200'},
    8107654171: {badges: [1], color: '#0b1c37', icon: ['xms2013_demo_plaid_hat.152c6db9806406bd10fd82bd518de3c89ccb6fad', 58, [-7, -8]]},
    8067575136: {badges: [1], icon: ['xms_pyro_parka.de5a5f80e74f428204a4f4a7d094612173adbe50', 13, [-9, -12]]},
    8044195191: {badges: [1], icon: ['fez.ee87ed452e089760f1c9019526d22fcde9ec2450', 43, [-2, -4]]},

    8056198948: {badges: [1], icon: ['jul13_soldier_fedora.ec4971943386c378e174786b6302d058e4e8627a', 10, [-5, -6]]},
    8165677507: {badges: [1], color: '#FF6000', icon: ['cc_summer2015_potassium_bonnett.3849871e2fe2b96fb41209de62defa59b136f038', 38, [-5, -6]]},

    8067795713: {badges: [1], color: '#000066', icon: ['soldier_warpig.e183081f85b5b2e3e9da1217481685613a3fed1f', 14, [-10, -11]]},
    7980709148: {badges: [1], color: '#A41408'},
    8081201910: {badges: [1], color: '#CC0000', icon: ['hat_first_nr.e7cb3f5de1158e924aede8c3eeda31e920315f9a', 64, [-10, -11]]},
    8117484140: {badges: [1], color: '#00BBFF', icon: ['medic_ttg_max.5c4b7fcf10ab25fbd166831aea1979395549cb75', 13, [-10, -11]]},
    8005031515: {badges: [1], icon: ['demo_hood.2fa33d5d09dcbfed6345cf927db03c10170b341e', 29, [-2, -5]]},
};

function renderUserBadges(badges) {
    var html = '';

    badges.forEach(function (n) {
        var badge = badgemap[n];

        html += '<div data-title="' + badge.title + '" data-content="' + badge.content + '"'+
            ' class="user-badge bes-badge' + (badge.class ? ' ' + badge.class : '') + '"' + (badge.style ? ' style="' + badge.style + '"' : "") + '>'+
            '<i class="fa ' + badge.icon + '"></i></div>';
    });

    $('.user-badge-list .user-badge:last').after(html);
}

function badgePopovers() {
    $('.user-badge.bes-badge').popover({html: true, trigger: 'hover', placement: 'bottom'});
}

function changeUserColors(handle) {
    handle.each(function () {
        var id = this.dataset.id || "",
            u = users[id.substr(ID_PREFIX.length)];

        if (!u || !u.color) return;

        this.style.fontWeight = 'bold';
        this.style.setProperty('color', u.color, 'important');
    });
}

function modifyBelts(handle) {
    handle.each(function () {
        var id = this.dataset.id || "",
            u = users[id.substr(ID_PREFIX.length)],
            icon, belt, padding, lmargin, rmargin;

        if (!u || !u.icon) return;
        icon = iconinf.apply(null, u.icon);
        belt = this.querySelector('.label-belt');

        if (!belt) return;

        padding = icon.padding || 14;
        if (icon.margin) lmargin = rmargin = icon.margin;
        if (icon.lmargin) lmargin = icon.lmargin;
        if (icon.rmargin) rmargin = icon.rmargin;

        belt.innerHTML = '<span style="background-image:' + icon.img + ';background-size:contain;background-repeat:no-repeat;padding:' + padding + 'px;margin-left:' + lmargin + 'px;margin-right:' + rmargin + 'px;color: transparent;">★</span>';
    });
}

function load() {
    var handle = Page.users(),
        user;

    // Name colors
    if (handle.length && location.pathname !== '/donate') {
        changeUserColors(handle);
    }

    modifyBelts(handle);

    // User badges
    if (!Page.isProfile()) return;

    user = users[Page.profileSteamID().substr(ID_PREFIX.length)];
    if (!user || !user.badges) return;

    renderUserBadges(user.badges);
    badgePopovers();
}

module.exports = load;
