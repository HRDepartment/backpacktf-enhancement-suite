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

function itemShiftSelect() {
    var backpack = Page.bp(),
        $i = $('.item:not(.spacer)'),
        $last, $select;

    Script.exec("$('.item:not(.spacer)').off('click');");
    $i.click(function (e) {
        var $this = $(this),
            $lidx;

        if (!backpack.selectionMode) {
            $last = null;
            if ($this.siblings('.popover').length === 0) {
                // Touchscreen compatibility.
                // Makes it so a popover must be visible before selection mode can be activated.
                return;
            }

            backpack.selectionMode = true;
            Page.unselectItem($('.item'));
            Page.selectItem($this);
            backpack.updateClearSelectionState();
        } else {
            if ($this.hasClass('unselected')) {
                if (e.shiftKey && $last && $last.not('.unselected') && ($lidx = $i.index($last)) !== -1) {
                    e.preventDefault();
                    document.getSelection().removeAllRanges();

                    if ($lidx > $i.index($this)) {
                        $select = $last.prevUntil($this);
                    } else {
                        $select = $last.nextUntil($this);
                    }

                    $last = $this;
                    Page.selectItem($select.add($this));
                } else {
                    $last = $this;
                    Page.selectItem($this);
                }
            } else {
                $last = null;
                Page.unselectItem($this);

                if ($('.item:not(.unselected)').length === 0) {
                    backpack.selectionMode = false;
                    Page.selectItem($('.item'));
                    backpack.updateClearSelectionState();
                }
            }
        }

        $('#clear-selection').click(function () {
            if (!$(this).hasClass('disabled')) {
                backpack.clearSelection();
            }
        });

        backpack.updateValues();
    });
}

function refValue() {
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

function addUnusualDetailsButtons() {
    function createDetails(item) {
        var details = window.uDetails_createDetails(item),
            data = item[0].dataset;

        if (data.app === "440" && data.quality === "5" && data.effectName) {
            details.find('.fa-list-alt').parent().after(
                '<a class="btn btn-default btn-xs" href="/unusuals/' + data.name + '"><i class="fa fa-diamond"></i> Unusual</a>'+
                '<a class="btn btn-default btn-xs" href="/effects/' + data.effectName + '"><i class="fa fa-paper-plane-o"></i> Effect</a>'
            );

        }

        return details;
    }

    Script.exec('var uDetails_createDetails = window.createDetails;'+
                'window.createDetails = ' + createDetails + ';');
}

function thirdPartyPrices() {
    if (Prefs.pref('other', 'thirdpartyprices')) return;

    function createDetails(item) {
        var statsName = item.data('converted-from') ? item.data('converted-from') : item.data('name');
        var friendlyUrl = '/' + item.data('q-name') + '/' + encodeURIComponent(statsName) + '/' + (item.data('tradable') == 1 ? "Tradable" : "Non-Tradable") + '/' + (item.data('craftable') == 1 ? "Craftable" : "Non-Craftable");

        if (item.data('priceindex') && item.data('priceindex') !== 0) {
            friendlyUrl += '/' + item.data('priceindex');
        }

        window.price_cache[friendlyUrl] = {};
        return window.tpp_createDetails(item);
    }

    Script.exec('var tpp_createDetails = window.createDetails;'+
                'window.createDetails = ' + createDetails + ';');
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
        var appid = +this.href.replace(/\D/g, ""),
            sub = "";

        //if (appid === 440) // Nothing special
        if (appid === 570) sub += "dota2.";
        else if (appid === 730) sub += "csgo.";

        this.href = "http://" + sub + "backpack.tf" + location.pathname;
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

    if (Page.isBackpack()) {
        refValue();
        itemShiftSelect();
    }

    addUnusualDetailsButtons();
    thirdPartyPrices();
}

function updateWallpaperCache(url, then) {
    var wallcache = new Cache("bes-cache-wallpaper", 0);

    if (wallcache.get("url").value !== url) {
        Script.GET(url, function (resp) {
            var wp = resp.replace(/\r/g, "").split("\n");

            wallcache.set("url", url).set("wallpapers", wp).save();
            then(wp);
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
        notifa = $('.md-notification-alert'),
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
    } else if (notifa.length && updatec === 'load') {
        updateNotifications();
    }

    if (notifa.length) notifa[0].setAttribute("target", "_blank");
}

function load() {
    global();
    if (location.pathname === '/') index();
}

module.exports = load;
