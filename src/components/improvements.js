var Prefs = require('../preferences'),
    Script = require('../script'),
    Pricing = require('../pricing'),
    Cache = require('../cache'),
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

function backpackHandler() {
    var refvalue = $("#refinedvalue");

    if (!refvalue.length) return;

    Pricing.shared(function (ec) {
        refvalue.tooltip({
            title: function () {
                return ec.format({value: +refvalue.text().replace(/,/g, ''), currency: 'metal'}, EconCC.Mode.Long);
            }
        });
    });
}

function global() {
    var account = $('.navbar-profile-nav .dropdown-menu a[href="/my/account"]'),
        help = $('.dropdown a[href="/help"]'),
        more = $('.text-more');

    if (location.pathname === '/' ||
        (Prefs.pref('homebg', 'replacewalls') &&
            /\/img\/bricks_/.test(getComputedStyle(document.body)['background-image']))) {
        applyWallpaper();
    }

    if (account.length) account.parent().after('<li><a href="/my/preferences"><i class="fa fa-fw fa-cog"></i> My Preferences</a></li>');
    if (help.length) help.parent().before('<li><a href="/lotto"><i class="fa fa-fw fa-money"></i> Lotto</a></li>');
    if (more.length) addMorePopovers(more);

    $('.navbar-game-select li a').each(function () {
        var appid = +this.href.replace(/\D/g, "");

        if (appid === 440) {
            this.href = "http://backpack.tf" + location.pathname;
        } else if (appid === 570) {
            this.href = "http://dota2.backpack.tf" + location.pathname;
        } else if (appid === 730) {
            this.href = "http://csgo.backpack.tf" + location.pathname;
        }

        this.target = "_blank";
     });

    if (Prefs.pref('other', 'originalkeys')) {
        $('[data-converted-from]').each(function () {
            var $this = $(this),
                output = $this.find('.output');

            $this.find('.item-icon').css('background-image', output.css('background-image'));
            output.remove();
        });
    }

    if (Page.isBackpack()) backpackHandler();
}

function updateWallpaperCache(url, then) {
    var wallcache = new Cache("bes-cache-wallpaper");

    if (wallcache.get("url").value !== url) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (resp) {
                var wp = resp.responseText.replace(/\r/g, "").split("\n");

                wallcache.set("url", url).set("wallpapers", wp).save();
                then(wp);
            }
        });
    } else {
        then(wallcache.get("wallpapers").value);
    }
}

function applyWallpaper() {
    var wallpaper = Prefs.prefs.features.homebg,
        url = wallpaper.image.trim();

    function csstext(img) {
        return 'background: url(' + img + '); background-repeat: ' + wallpaper.repeat + '; background-position: ' + wallpaper.posx + ' ' + wallpaper.posy + '; background-attachment: ' + wallpaper.attachment + '; background-size: ' + wallpaper.sizing + ';';
    }

    if (url) {
        if (url.match(/pastebin\.com\/raw.php\?i=/)) {
            updateWallpaperCache(url, function (wallpapers) {
                var wallpaper = wallpapers[Math.floor(Math.random() * wallpapers.length)].trim();
                if (wallpaper) document.body.style.cssText = csstext(wallpaper);
            });
        } else {
            document.body.style.cssText = csstext(url);
        }
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
            notifs.find(".notification").click(updateNotifications).attr("target", "_blank");
        }
    }
}

function load() {
    global();
    if (location.pathname === '/') index();
}

module.exports = load;
