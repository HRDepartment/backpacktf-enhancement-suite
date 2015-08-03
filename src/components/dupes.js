var Script = require('../script'),
    Page = require('../page'),
    MenuActions = require('../menu-actions');

// Injected into the page
function addDupeCheck() {
    function addDupeWarn(historybtn, dupe) {
        historybtn.removeClass('btn-default').addClass(dupe ? 'btn-danger' : 'btn-success');
    }

    function checkDuped(oid, btn) {
        $.get("/item/" + oid, function (html) {
            var dupe = /Refer to entries in the item history <strong>where the item ID is not chronological/.test(html);
            window.dupeCache[oid] = dupe;
            window.addDupeWarn(btn, dupe);
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
                        window.checkDuped(oid, historybtn);
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

function bpDupeCheck() {
    var items = [];

    if (!Page.bp().selectionMode) {
        return alert("Select the items you want to dupe-check first.");
    }

    $('.item:not(.spacer,.unselected):visible').each(function () {
        var $this = $(this),
            stack = $this.find('.icon-stack');

        if (!stack.length) {
            $this.append('<div class="icon-stack"></div>');
            stack = $this.find('.icon-stack');
        }

        if (stack.find('.dupe-check-result').length) return;

        stack.append('<div class="arrow-icon"><i class="fa fa-spin fa-spinner dupe-check-result"></i></div>');
        items.push($this);
    });

    if (!items.length) {
        return alert("No unchecked items in this selection");
    }

    (function next() {
        var item = items.shift(),
            spinner, oid;

        if (!item) return;
        oid = item.attr('data-original-id');
        spinner = item.find('.dupe-check-result');

        function applyIcon(dupe) {
            spinner.removeClass('fa-spinner fa-spin');

            if (dupe) {
                spinner.addClass('fa-exclamation-circle').css('color', 'red');
            } else {
                spinner.addClass('fa-check-circle').css('color', 'green');
            }

            next();
        }

        if (unsafeWindow.dupeCache.hasOwnProperty(oid)) return applyIcon(unsafeWindow.dupeCache[oid]);
        $.get("/item/" + oid, function (html) {
            var dupe = /Refer to entries in the item history <strong>where the item ID is not chronological/.test(html);
            unsafeWindow.dupeCache[oid] = dupe;
            applyIcon();
        });
    }());
}

function addBackpackDupeCheck() {
    MenuActions.addAction({
        name: 'Dupe-Check Collection',
        icon: 'fa-check',
        id: 'dupe-check',
        click: bpDupeCheck
    });
}

function load() {
    addDupeCheck();
    if (Page.isBackpack()) {
        addBackpackDupeCheck();
    }
}

module.exports = load;
