var Prefs = require('../preferences'),
    MenuActions = require('../menu-actions'),
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

function addDupeCheck() {
    function addDupeWarn(historybtn, dupe) {
        historybtn.removeClass('btn-default').addClass(dupe ? 'btn-danger' : 'btn-success');
    }

    function checkDuped(oid) {
        $.get("/item/" + oid, function (html) {
            var dupe = /Refer to entries in the item history <strong>where the item ID is not chronological/.test(html);
            window.dupeCache[oid] = dupe;
            // Use the newest history button in case user hovers away
            window.addDupeWarn($('.popover .fa-calendar-o').parent(), dupe);
        });
    }

    function createDetails(item) {
        var details = window.dupe_createDetails(item),
            oid = item.attr('data-original-id'),
            historybtn = details.find('.fa-calendar-o').parent();

        if (window.dupeCache[oid] != null) { // undefined/null (none/in progress)
            window.addDupeWarn(historybtn, window.dupeCache[oid]);
        } else {
            historybtn.mouseover(function () {
                if (window.dupeCache[oid] !== null) { // not in progress
                    window.dupeCache[oid] = null;
                    setTimeout(function () {
                        window.checkDuped(oid);
                    }, 80);
                }
            });
        }

        return details;
    }

    Script.exec('var dupe_createDetails = window.createDetails, dupeCache = {};'+
                'window.checkDuped = ' + checkDuped + ';'+
                'window.addDupeWarn = ' + addDupeWarn + ';'+
                'window.createDetails = ' + createDetails + ';');
}

function global() {
    var account = $('#profile-dropdown-container a[href="/my/account"]'),
        help = $('.dropdown a[href="/help"]'),
        more = $('.text-more');

    if (account.length) account.parent().after('<li><a href="/my/preferences"><i class="fa fa-fw fa-cog"></i> My Preferences</a></li>');
    if (help.length) help.parent().before('<li><a href="/lotto"><i class="fa fa-fw fa-money"></i> Lotto</a></li>');
    if (more.length) addMorePopovers(more);

    addDupeCheck();
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
