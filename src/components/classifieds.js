var Page = require('../page'),
    Script = require('../script'),
    Prefs = require('../preferences'),
    API = require('../api'),
    MenuActions = require('../menu-actions'),
    Pricetags = require('./pricetags');

var classifiedsCache = {};

function peek(e) {
    var item = $('.item'),
        name, url;

    e.preventDefault();
    name = item.data('name');
    if (item.data('australium')) {
        name = name.substring(11);
    }
    url = '/classifieds/?item=' + name + '&quality=' + item.data('quality') + '&tradable=' + item.data('tradable') + '&craftable=' + item.data('craftable');
    if (item.data('australium')) {
        url += '&australium=1';
    }
    if (item.data('crate')) {
        url += '&numeric=crate&comparison=eq&value=' + item.data('crate');
    }

    $.ajax({
        method: "GET",
        url: url,
        success: function (html) {
            $("#peak-panel").append('<div class="panel-body padded"><div id="classifieds-sellers"></div></div>');
            var $sellers = $("#classifieds-sellers"),
                h = $.parseHTML(html),
                items = [],
                clones;

            $('.item', h).each(function () {
                var clone = this.cloneNode(true);
                clone.classList.add('classifieds-clone');

                items.push(clone);
            });

            $sellers.html(items);

            clones = $('.classifieds-clone');
            Page.addItemPopovers(clones, $sellers);

            if (Pricetags.enabled()) {
                Pricetags.setupInst(function () {
                    Pricetags.applyTagsToItems(clones);
                });
            }
        },
        dataType: "html"
    });
}

function add() {
    var htm =
        '<div class="row"><div class="col-12 "><div class="panel" id="peak-panel">'+
        '<div class="panel-heading">Classifieds <span class="pull-right"><small><a href="#" id="classifieds-peek">Peek</a></small></span></div>'+
        '</div></div></div></div>';
    var signature = Prefs.pref('classifieds', 'signature'),
        $details = $("#details");

    $('#page-content .row:eq(1)').before(htm);
    $("#classifieds-peek").one('click', peek);

    if (!$details.val().length) {
        $details.val(signature);
        Script.exec('$("#details").trigger("blur");');
    }
}

function checkAutoclose() {
    if (Prefs.pref('classifieds', 'autoclose') &&
        /Your listing was posted successfully/.test($('.alert-success').text())) {
        window.close();
    }
}

function findListing(obj, id) {
    var listings = obj.listings,
        listing, len, i;

    for (i = 0, len = listings.length; i < len; i += 1) {
        listing = listings[i];

        if (listing.id == id) return {bump: listing.bump, created: listing.created};
    }
}

function switchTimes($this, listing, obj) {
    var lid = listing[0].id.substr(8),
        mode = $this.attr('data-mode'),
        handle = $this.find('.user-handle-container'),
        list = findListing(obj, lid);

    if (!list) {
        listing.remove(); // No longer exists
        return;
    }

    if (mode === '0') { // posted
        $this.html('Created <span class="timeago listing-timeago" title="' + (new Date(list.created * 1000)).toISOString() + '">' + (moment.unix(list.created).fromNow()) + '</span> by ');
    } else { // created
        $this.html('Posted <span class="timeago listing-timeago" title="' + (new Date(list.bump * 1000)).toISOString() + '">' + (moment.unix(list.bump).fromNow()) + '</span> by ');
    }

    $this.append(handle).attr('data-mode', +!+mode);
    if (mode === '0') { // add bumped
        $this.append(' <small>Bumped <span class="timeago listing-timeago" title="' + (new Date(list.bump * 1000)).toISOString() + '">' + (moment.unix(list.bump).fromNow()) + '</span></small>');
    }

    Script.exec('$(".listing-timeago").timeago().tooltip({placement: "top", animation: false});');
}

function listingClick(next) {
    var $this = $(this),
        steamid = $this.find('.handle').attr('data-id'),
        listing = $this.closest('.media.listing'),
        cache = classifiedsCache[steamid];

    if (!steamid) return;

    if (cache) {
        switchTimes($this, listing, cache);
        if (typeof next === 'function') next();
        return;
    } else if (cache === false) {
        return; // already loading
    }

    classifiedsCache[steamid] = false;
    API.IGetUserListings(steamid, function (obj) {
        classifiedsCache[steamid] = obj;
        switchTimes($this, listing, obj);

        if (typeof next === 'function') next();
    });
}

function global() {
    var media = $('.listing-buttons').parent().filter('.listing-intent-sell'),
        listingTimes = media.find('.text-muted:first');

    if (!listingTimes.length) return;

    listingTimes.click(listingClick).attr('data-mode', '0');
    MenuActions.addAction({
        name: 'Swap Listing Time',
        icon: 'fa-exchange',
        id: 'swap-listing-time',
        click: function () {
            var at = 0;

            (function next() {
                var elem = listingTimes[at];

                if (!next) return;
                at += 1;
                listingClick.call(elem, next);
            }());
        }
    });
}

function load() {
    page('/classifieds/:type/:id', add);
    page('/classifieds/', checkAutoclose);
    global();
}

module.exports = load;
