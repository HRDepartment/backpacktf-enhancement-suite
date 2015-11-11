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

        state.token = Script.exec("window.userID") || menu.find('.fa-sign-out').parent().attr('href').replace(/(.*?=)/, '');
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
    item.each(function () {
        var $this = $(this),
            self = this,
            id = Script.uniq();

        $this.mouseenter(function () {
            if ($this.parent().hasClass('item-list-links')) {
                return;
            }

            function next(h) {
                var content, placement,
                    fn = h ? h : handlers;

                content = typeof fn.content === "function" ? fn.content.call(this, id) : fn.content;
                placement = typeof fn.placement === "function" ? fn.placement.call(this, id) : fn.placement;

                // Firefox support
                $this.attr('data-bes-id', id);
                Script.exec(
                    '(function () {'+
                        'var elem = $("[data-bes-id=\\"' + id + '\\"]");'+
                        'elem.popover({animation: false, html: true, trigger: "manual", ' + (placement ? 'placement: ' + placement + ', ' : '') + 'content: ' + content + '});'+
                    '}());'
                );

                setTimeout(function () {
                    if ($this.filter(':hover').length) {
                        // Firefox support
                        Script.exec(
                            '(function () {'+
                                'var popover = $("[data-bes-id=\\"' + id + '\\"]");'+
                                '$(".popover").remove(); popover.popover("show"); popover.style.padding = 0;'+
                                (fn.show ? '(' + fn.show + ').call(popover, "' + id + '");' : '')+
                            '}());'
                        );
                    }
                }, fn.delay ? 300 : 0);
            }

            if (handlers.next) handlers.next.call(this, next.bind(this));
            else next.call(this);
        }).mouseleave(function () {
            setTimeout(function () {
                var id = self.getAttribute('data-bes-id');
                if (!$this.filter(':hover').length && !$('.popover:hover').length) {
                    // Firefox support
                    Script.exec(
                        '(function () {'+
                            'var popover = $("[data-bes-id=\\"' + id + '\\"]");'+
                            'popover.popover("hide");'+
                            (handlers.hide ? '(' + handlers.hide + ').call(popover, "' + id + '");' : '')+
                        '}());'
                    );
                }
            }, 100);
        }).on('shown.bs.popover', function () {
            Script.exec("$('.popover-timeago').timeago();");
        });
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
        content: 'window.createDetails(elem)',
        placement: 'window.get_popover_placement',
        show: function () {
            var ds = this.dataset,
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

exports.modal = function (titleContent, bodyContent, footerContent){
    var active_modal = $('<div class="modal fade" id="active-modal"/>'),
        dialog = $('<div class="modal-dialog"/>'),
        content = $('<div class="modal-content"/>'),
        header = $('<div class="modal-header"/>'),
        body = $('<div class="modal-body"/>'),
        footer = $('<div class="modal-footer" />'),
        headerClose = $('<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'),
        title = $('<h4 class="modal-title"/>');

    $('#active-modal').remove();
    $('.modal-backdrop').remove();

    footerContent = footerContent === undefined ? $('<a class="btn btn-default" data-dismiss="modal">Dismiss</a>') : footerContent;

    $('#page-content').append(active_modal.append(
        dialog.append(
            content.append(
                header.append(headerClose).append(title.append(titleContent))
            ).append(body.append(bodyContent)).append(footer.append(footerContent))
        )
    ));

    Script.exec('$("#active-modal").modal();');
};

exports.hideModal = function () {
    $("#active-modal").remove();
};

exports.bp = function () { return Script.exec("window.backpack"); };
exports.selectItem = function (e) { e.removeClass('unselected'); };
exports.unselectItem = function (e) { e.addClass('unselected'); };
