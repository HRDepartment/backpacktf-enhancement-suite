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

var users = {
    "76561198070299574": {badges: [BadgeSelfMade], color: '#028482'},
    "76561198039453751": {badges: [BadgeSupporter]},
    "76561198068022595": {badges: [BadgeSupporter], color: '#f9d200'},
    "76561198107654171": {badges: [BadgeSupporter], color: '#0b1c37'},
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

function load() {
    var handle = Page.users(),
        user;

    // Name colors
    if (handle.length && location.pathname !== '/donate') {
        changeUserColors(handle);
    }

    // User badges
    if (!Page.isProfile()) return;

    user = users[Page.profileSteamID()];
    if (!user || !user.badges) return;

    renderUserBadges(user.badges);
    badgePopovers();
}

module.exports = load;
