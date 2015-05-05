var Script = require('./script');

var nonNumerical = /\D/g;

var state = {
    ownid: "",
    profile: false,
    backpack: false,
    ownprofile: false,
    ownbackpack: false,
    steamid: "",
    loggedin: false,
    token: "",
    appid: 0,
    indexpage: false,
    loaded: false,
    handles: {}
};

function getter(name, val) {
    exports[name] = function () { return state[val]; };
}

exports.init = function () {
    state.steamid = $('.profile .avatar-container a')[0] || "";
    state.loggedin = !!document.getElementById("profile-dropdown-container");

    if (state.steamid) {
        state.profile = true;
        state.backpack = state.profile && !!document.getElementById('backpack');
        state.steamid = state.steamid.href.replace(nonNumerical, '');
    }

    if (state.loggedin) {
        state.ownid = $('#profile-dropdown-container .fa-briefcase').parent().attr('href').replace(nonNumerical, '');
        if (state.profile) {
            state.ownprofile = state.ownid === state.steamid;
        }

        state.token = unsafeWindow.userID || $('#profile-dropdown-container .fa-sign-out').parent().attr('href').replace(/(.*?=)/, '');
        state.ownbackpack = state.ownprofile && state.backpack;
    }

    state.indexpage = location.pathname === '/';

    state.appid = 440;
    if (location.hostname.indexOf("dota2") !== -1) state.appid = 570;
    state.handles = $('.handle');
};

exports.state = state;

getter('isProfile', 'profile');
getter('isBackpack', 'backpack');
getter('profileSteamID', 'steamid');
getter('loggedIn', 'loggedin');
getter('userSteamID', 'ownid');
getter('isUserProfile', 'ownprofile');
getter('isUserBackpack', 'ownbackpack');
getter('csrfToken', 'token');
getter('appid', 'appid');
getter('isIndexPage', 'indexpage');
getter('ready', 'loaded');
getter('users', 'handles');

exports.hideModal = function () {
    Script.exec('$("#active-modal").modal("hide");');
};

exports.addTooltips = function (elem, container) {
    if (!elem) elem = $("[data-suite-tooltip]");
    elem.tooltip({container: container || 'body'});
};

// Copypastas for Firefox support
exports.addItemPopovers = function (item, container) {
    item.mouseenter(function() {
        var $this = $(this),
            id = (Math.random() + "") + (Date.now() + "");

        if ($this.parent().hasClass('item-list-links')) {
            return;
        }

        // Firefox support
        $this.attr('data-bes-id', id);
        Script.exec('(function () {'+
                    'var jq = $("[data-bes-id=\\"' + id + '\\"]");'+
                    'jq.popover({animation: false, html: true, trigger: "manual", placement: window.get_popover_placement, content: window.createDetails(jq)});'+
                    '}());');

        setTimeout(function () {
            if ($this.filter(':hover').length) {
                // Firefox support
                Script.exec('$(".popover").remove(); $("[data-bes-id=\\"' + id + '\\"]").popover("show"); $(".popover").css("padding", 0);');
                $('#search-bazaar').click(function () {
                    unsafeWindow.searchBazaar($this.data('defindex'), $this.data('quality'), $this.data('priceindex'), $this.data('craftable') == 1 ? 0 : 1, $this.data('app'));
                });

                $('#search-outpost').click(function () {
                    unsafeWindow.searchOutpost($this.data('defindex'), $this.data('quality'), $this.data('priceindex'), $this.data('craftable') == 1 ? 0 : 1, $this.data('app'));
                });

                $('#search-lounge').click(function() {
                    unsafeWindow.searchLounge($this.data('defindex'), $this.data('quality'));
                });
            }
        }, 300);
    }).mouseleave(function () {
        var $this = $(this);

        setTimeout(function () {
            if (!$this.filter(':hover').length && !$('.popover:hover').length) {
                // Firefox support
                Script.exec('$("[data-bes-id=\\"' + $this.attr('data-bes-id') + '\\"]").popover("hide");');
            }
        }, 100);
    }).on('shown.bs.popover', function () {
        Script.exec("$('.popover-timeago').timeago();");
    });

    if (container) {
        container.on('mouseleave', '.popover', function () {
            var $this = $(this);

            setTimeout(function() {
                if (!$this.is(':hover')) {
                    $this.remove();
                }
            }, 300);
        });
    }
};

exports.escapeHtml = function (message) {
    return $('<span>').text(message).text().replace(/"/g, "&quot;").replace(/'/g, "&apos;");
};

exports.addStyle = GM_addStyle;

exports.SUITE_VERSION = '1.0.0';
