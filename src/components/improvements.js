var Prefs = require('../preferences'),
    MenuActions = require('../menu-actions'),
    Script = require('../script');

function addRemoveAllListings() {
    MenuActions.addAction({
        name: 'Remove Listings',
        icon: 'fa-trash-o',
        id: 'rm-classifieds-listings',
        click: function () {
            Script.exec("$('.listing-remove').click().click();"); // Double .click for confirmation
            (function refresh() {
                setTimeout(function () {
                    if (!$('.listing-remove').length) location.reload();
                    else refresh();
                }, 300);
            }());
        }
    });
}

function global() {
    var account = $('#profile-dropdown-container a[href="/my/account"]'),
        help = $('.dropdown a[href="/help"]'),
        moreCache = {}, moreLoading = {};

    if (account.length) account.parent().after('<li><a href="/my/preferences"><i class="fa fa-fw fa-cog"></i> My Preferences</a></li>');
    if (help.length) help.parent().before('<li><a href="/lotto"><i class="fa fa-fw fa-money"></i> Lotto</a></li>');
    if ($('.listing-remove').length) addRemoveAllListings();

    $('.text-more').mouseover(function() {
        var $this = $(this),
            url = $this.closest('.vote').find('.vote-stats li:eq(1) a').attr('href');

        function showPopover(html) {
            $this.popover({content: html, html: true}).popover('show');
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
    }).mouseout(function () { $(this).popover('hide'); });
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
        } else if (updatec === 'click') {
            notifs.find(".notification").click(updateNotifications);
        }
    }
}

function load() {
    global();
    page('/', index);
    page.start({click: false, popstate: false});
}

module.exports = load;
