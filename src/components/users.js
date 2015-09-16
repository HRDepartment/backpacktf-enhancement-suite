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

function Starless(item, particle, margins) {
    var o = {img: ['https://steamcdn-a.akamaihd.net/apps/440/icons/' + item + '.png', '/images/440/particles/' + particle + '_94x94.png'], star: false};
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
    "76561198070299574": {badges: [BadgeSelfMade], color: '#028482'},
    "76561198039453751": {badges: [BadgeSupporter], icon: Starless('soldier_hat.61b68df2672217c4d2a2c98e3ed5e386a389d5cf', 14, [-4, -4])},
    "76561198068022595": {badges: [BadgeSupporter], color: '#f9d200'},
    "76561198107654171": {badges: [BadgeSupporter], color: '#0b1c37', icon: Starless('xms2013_demo_plaid_hat.152c6db9806406bd10fd82bd518de3c89ccb6fad', 58, [-7, -8])},
    "76561198067575136": {badges: [BadgeSupporter], icon: Starless('xms_pyro_parka.de5a5f80e74f428204a4f4a7d094612173adbe50', 13, [-9, -12])},
    "76561198044195191": {badges: [BadgeSupporter], icon: Starless('fez.ee87ed452e089760f1c9019526d22fcde9ec2450', 43, [-2, -3])},
};

function renderUserBadges(badges) {
    var html = '';

    badges.forEach(function (badge) {
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
        var id = this.dataset.id,
            u = users[id];

        if (!u || !u.color) return;

        this.style.fontWeight = 'bold';
        this.style.setProperty('color', u.color, 'important');
    });
}

function modifyBelts(handle) {
    handle.each(function () {
        var id = this.dataset.id,
            u = users[id],
            icon, belt, padding, lmargin, rmargin;

        if (!u || !u.icon) return;
        icon = u.icon;
        belt = this.querySelector('.label-belt');

        if (!belt) return;

        padding = icon.padding || 14;
        if (icon.margin) lmargin = rmargin = icon.margin;
        if (icon.lmargin) lmargin = icon.lmargin;
        if (icon.rmargin) rmargin = icon.rmargin;

        belt.innerHTML = '<span style="background-image:' + icon.img.map(function (img) { return 'url(' + img + ')'; }).join(',') + ';background-size:contain;background-repeat:no-repeat;padding: ' + padding + 'px;margin-left:' + lmargin + 'px;margin-right:' + rmargin + 'px;' + (icon.star !== false ? '' : 'color: transparent;') + '">★</span>';
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

    user = users[Page.profileSteamID()];
    if (!user || !user.badges) return;

    renderUserBadges(user.badges);
    badgePopovers();
}

module.exports = load;
