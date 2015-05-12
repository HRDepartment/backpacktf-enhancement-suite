var MenuActions = require('../menu-actions');
var Script = require('../script');

var refreshed = [],
    listings;

function addRefreshButtons() {
    $('.media.listing').filter(':has(.listing-intent-sell)').find('.listing-report').each(function () {
        $(this).parent().prepend(
            '<a class="btn btn-xs btn-bottom btn-primary listing-refreshbp" data-tip="top" title="" data-original-title="Refresh this user\'s backpack.">'+
            '<i class="fa fa-sw fa-refresh"></i>'+
            '</a>'
        );
    });

    listings = !!$('.listing-refreshbp').length;
}

function addButtonTooltips() {
    Script.exec("$('.listing-refreshbp').tooltip({placement: get_tooltip_placement, animation: false});");
}

function updateBackpack(steamid, next) {
    if (refreshed[steamid]) {
        next();
    } else {
        refreshed.push(steamid);
        $.get("http://backpack.tf/profiles/" + steamid, next);
    }
}

function findSteamid(refresh) {
    return refresh.closest('.media.listing').find('.media-object').find('li').data('listing-steamid');
}

function addButtonListeners() {
    $('.listing-buttons').on('click', '.listing-refreshbp', function () {
        var $this = $(this);

        updateBackpack(findSteamid($this), function () {
            $this.fadeOut();
        });
    });
}

function refreshAll(e) {
    var steamids = [],
        at = 0;

    if (e) e.preventDefault();

    $('.listing-refreshbp').each(function () {
        var $this = $(this);
        steamids.push([findSteamid($this), $this]);
    });

    (function next() {
        if (steamids[at]) {
            updateBackpack(steamids[at][0], function () {
                steamids[at][1].fadeOut();
                at += 1;
                next();
            });
        } else {
            location.reload();
        }
    }());
}

function addMenuAction() {
    MenuActions.addAction({
        name: 'Refresh All',
        icon: 'fa-refresh',
        id: 'refresh-all',
        click: refreshAll
    });
}

function addRallHeader(elem, sep) {
    return function () {
        var header = $('<span class="pull-right"><small><a href="#" id="header-refresh-all">Refresh All</a></small></span>' + (sep ? " | " : ""));
        header.find('#header-refresh-all').click(refreshAll);

        elem.append(header);
    };
}


function load() {
    addRefreshButtons();

    if (!listings) return;

    addButtonTooltips();
    addButtonListeners();
    page('/classifieds/', addRallHeader($('#media-container-row-alt .panel-heading:first')));
    page('/stats/:quality/:name/:tradable/:craftable', addRallHeader($('#page-content .panel-heading:contains(Classified)', true)));
    addMenuAction();
}

module.exports = load;
