var Prefs = require('../preferences'),
    Script = require('../script'),
    Page = require('../page');

function addMorePopovers(more) {
    var moreCache = {},
        moreLoading = {};

    Page.addPopovers(more, $('.row:eq(4)'), {
        next: function (fn) {
            var $this = $(this),
                vote = $this.closest('.vote'),
                url = vote.find('.vote-stats li:eq(1) a').attr('href');

            function showPopover(html) {
                fn({
                    content: '"' + html.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"',
                    placement: '"right"'
                });
            }

            if (moreCache[url]) return showPopover(moreCache[url]);
            if (moreLoading[url]) return;

            moreLoading[url] = true;
            $.get(url).done(function (page) {
                var html = $($.parseHTML(page)).find('.op .body').html();
                moreCache[url] = html;

                showPopover(html);
            }).always(function () {
                moreLoading[url] = false;
            });
        },
        delay: false
    });
}

function global() {
    var account = $('.navbar-profile-nav .dropdown-menu a[href="/my/account"]'),
        help = $('.dropdown a[href="/help"]'),
        more = $('.text-more');

    if (account.length) account.parent().after('<li><a href="/my/preferences"><i class="fa fa-fw fa-cog"></i> My Preferences</a></li>');
    if (help.length) help.parent().before('<li><a href="/lotto"><i class="fa fa-fw fa-money"></i> Lotto</a></li>');
    if (more.length) addMorePopovers(more);

    if (Prefs.pref('other', 'originalkeys')) {
        $('[data-converted-from]').each(function () {
            var $this = $(this),
                output = $this.find('.output');

            $this.find('.item-icon').css('background-image', output.css('background-image'));
            output.remove();
        });
    }
}

function applyWallpaper() {
    var wallpaper = Prefs.prefs.features.homebg;

    if (wallpaper.image.trim()) {
        document.body.style.cssText = 'background: url(' + wallpaper.image + '); background-repeat: ' + wallpaper.repeat + '; background-position: ' + wallpaper.posx + ' ' + wallpaper.posy + '; background-attachment: ' + wallpaper.attachment + '; background-size: ' + wallpaper.sizing + ';';
    }
}

function index() {
    function updateNotifications() {
        if (!notifsu) {
            $.get("/notifications");
            notifsu = true;
        }
    }

    var lotto = Prefs.pref('lotto', 'show'),
        updatec = Prefs.pref('notifications', 'updatecount'),
        notifs = $('.notification-list'),
        notifsu = false,
        newnotif;

    if (!lotto) {
        Script.exec("updateLotto = $.noop;");
        $('.lotto-box').remove();
    }

    if (notifs.length && updatec !== 'no') {
        newnotif = notifs.find(".notification.new");

        if ((updatec === 'load' && newnotif.length) ||
            (updatec === 'listing' && newnotif.find('.subject a:contains([removed listing])').length)) {
            newnotif.removeClass('.new');
            $("#notifications_new").remove();

            updateNotifications();
        }

        if (updatec === 'click' || updatec === 'listing') {
            notifs.find(".notification").click(updateNotifications);
        }
    }

    applyWallpaper();
}

function load() {
    global();
    page('/', index);
    page.start({click: false, popstate: false});
}

module.exports = load;
