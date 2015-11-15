var Script = require('./script');

// Suite stuff

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
    var menu = $('.navbar-profile-nav .dropdown-menu');
    state.steamid = $('.profile .avatar-container a')[0] || "";
    state.loggedin = menu.length;

    if (state.steamid) {
        state.profile = true;
        state.backpack = state.profile && !!document.getElementById('backpack');
        state.steamid = state.steamid.href.replace(nonNumerical, '');
    }

    if (state.loggedin) {
        state.ownid = menu.find('.fa-briefcase').parent().attr('href').replace(nonNumerical, '');
        if (state.profile) {
            state.ownprofile = state.ownid === state.steamid;
        }

        state.token = Script.window.userID || menu.find('.fa-sign-out').parent().attr('href').replace(/(.*?=)/, '');
        state.ownbackpack = state.ownprofile && state.backpack;
    }

    state.indexpage = location.pathname === '/';

    state.appid = 440;
    if (location.hostname.indexOf("dota2") !== -1) state.appid = 570;
    else if (location.hostname.indexOf("csgo") !== -1) state.appid = 730;
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

exports.escapeHtml = function (message) {
    return $('<span>').text(message).text().replace(/"/g, "&quot;").replace(/'/g, "&apos;");
};

exports.addStyle = function (css) {
    var style = document.createElement('style');
    style.textContent = css;
    (document.head || document.body || document.documentElement).appendChild(style);
};

exports.$id = function (id) { return document.getElementById(id); };

exports.SUITE_VERSION = GM_info.script.version;

// Page stuff/userscript fixes

exports.addTooltips = function (elem, container) {
    if (!elem) elem = $("[data-suite-tooltip]");
    elem.tooltip({container: container || 'body'});
};

// handlers{fn(id)|str content, fn(id)|str placement, fn(id) show, fn(id) hide}
// fn is bound to this, remember to wrap strings in ""
// if content/placement is str, variable elem refers to the element
exports.addPopovers = function (item, container, handlers) {
    item.mouseenter(function () {
        var $this = $(this);
        if ($this.parent().hasClass('item-list-links')) {
            return;
        }

        function next(fn) {
            var content, placement;
            fn = fn || {};

            content = typeof fn.content === "function" ? fn.content.call($this) : fn.content;
            placement = typeof fn.placement === "function" ? fn.placement.call($this) : fn.placement;

            $this.popover({animation: false, html: true, trigger: "manual", placement: placement, content: content});
            setTimeout(function () {
                if ($this.filter(':hover').length) {
                    $(".popover").remove();
                    $this.popover("show");
                    $this[0].style.padding = 0;
                    if (fn.show) fn.show.call($this);
                }
            }, fn.delay || 0);
        }

        if (handlers.next) handlers.next.call($this, next);
        else next(handlers);
    }).mouseleave(function () {
        var $this = $(this);
        setTimeout(function () {
            if (!$this.filter(':hover').length && !$('.popover:hover').length) {
                $this.popover("hide");
                if (handlers.hide) handlers.hide.call($this);
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

    return item;
};

exports.addItemPopovers = function (item, container) {
    exports.addPopovers(item, container, {
        content: function () { return Script.window.createDetails(this); },
        placement: function () { return Script.window.get_popover_placement; },
        show: function () {
            var ds = this[0].dataset,
                di = ds.defindex,
                dq = ds.quality,
                dpi = ds.priceindex,
                dc = +!ds.craftable,
                da = ds.app;

            $('#search-bazaar').click(function () {
                window.searchBazaar(di, dq, dpi, dc, da);
            });

            $('#search-outpost').click(function () {
                window.searchOutpost(di, dq, dpi, dc, da);
            });

            $('#search-lounge').click(function() {
                window.searchLounge(di, dq);
            });
        }
    });
};

// don't pass html to return just an icon stack
exports.addItemIcon = function (el, html) {
    var elem = $(el),
        stack = elem.find('.icon-stack');

    if (!stack.length) {
        elem.append('<div class="icon-stack"></div>');
        stack = elem.find('.icon-stack');
    }

    if (!html) return stack;
    return stack.append(html);
};

exports.modal = function () { return Script.window.modal.apply(Script.window, arguments); };
exports.hideModal = function () {
    $("#active-modal, .modal-backdrop").remove();
};

exports.bp = function () { return Script.window.backpack; };
exports.selectItem = function (e) { e.removeClass('unselected'); };
exports.unselectItem = function (e) { e.addClass('unselected'); };
