var Page = require('../page'),
    Script = require('../script'),
    Prefs = require('../preferences');

var currencyNames = {"long":{"earbuds":["bud","buds"],"keys":["key","keys"],"metal":["ref","ref"]},"short":{"earbuds":["b","b"],"keys":["k","k"],"metal":["r","r"]}},
    defaults = [
        {metal: 0.05, keys: 0, earbuds: 0, message: ""},
        {metal: 0.11, keys: 0, earbuds: 0, message: ""},
        {metal: 0, keys: 1, earbuds: 0, message: ""}
    ],
    values;

function loadQuicklists() {
    var customlists = localStorage.getItem("bes-quicklists");

    if (customlists) {
        values = JSON.parse(customlists);
    } else {
        values = defaults;
        localStorage.setItem("bes-quicklists", JSON.stringify(values));
    }
}

function addQuicklistPanelButtons() {
    $('#backpack').closest('.panel').find('.panel-heading .pull-right').html(
        '<a id="bp-custom-select-ql" class="btn btn-default btn-primary btn-xs disabled" href="##" style="margin-top: -2px;">Quicklist selection</a>'+
        ' <a id="show-markdown-modal" class="btn btn-default btn-primary btn-xs" href="##" style="margin-top: -2px;">Convert to text</a>'
    );
}

function updateSelectQuicklist() {
    $("#bp-custom-select-ql").toggleClass("disabled", !unsafeWindow.selection_mode);
}

function onActionButtonClick() {
    var $this = $(this),
        action = $this.data('action');

    if (action === 'select') {
        copyButtonValues(values[$(this).data('idx')], $('.ql-button-values'));
    } else if (action === 'listbatch') {
        listSelection(buttonValue($('.ql-button-values')));
        Page.hideModal();
    }
}

function findSample() {
    return $('[data-listing-offers-url]').first();
}

function currentSelection() {
    return $('.item:not(.spacer,.unselected,.ql-cloned):visible').filter(function () {
        var item = $(this);
        return item.data("can-sell") && !item.data("listing-steamid");
    });
}

function qlFormatValue(value, short) {
    var str = [],
        cnames = currencyNames[short ? "short" : "long"],
        space = short ? "" : " ";

    if (value.earbuds) str.push(value.earbuds + space + cnames.earbuds[+(value.earbuds !== 1)]);
    if (value.keys) str.push(value.keys + space + cnames.keys[+(value.keys !== 1)]);
    if (value.metal) str.push(value.metal + space + cnames.metal[+(value.metal !== 1)]);
    return str.join(', ');
}

function addStyles() {
    Page.addStyle(
        ".ql-button-value-idx { margin-right: 3px; }"+
        ".ql-button-value { width: 70px; height: 32px; margin-bottom: 3px; margin-top: -2px; }"+
        ".ql-message { height: 32px; margin-bottom: 15px; }"+
        ".ql-button-message-label { margin-top: 4px; margin-left: 1px; }"+
        ".ql-remove-button { margin-left: 15px; }"+
        ".ql-label { display: inline-block; }"+
        ".ql-label-metal { padding-left: 1px; } .ql-label-keys { padding-left: 39px; } .ql-label-earbuds { padding-left: 40px; }"
    );
}

function quicklistSelectHtml(value, idx) {
    return '<a class="btn btn-primary ql-button-value-idx ql-action-button" data-action="select" data-idx="' + idx + '" style="margin-right: 3px;">' + qlFormatValue(value, true) + '</a>';
}

function quicklistBtnHtml(metal, keys, earbuds, message, remove) {
    return '<div class="ql-button-values form-inline">'+
        '<div class="ql-label ql-label-metal"><label>Metal</label></div>'+
        ' <div class="ql-label ql-label-keys"><label>Keys</label></div>'+
        ' <div class="ql-label ql-label-earbuds"><label>Earbuds</label></div> '+
        (remove !== false ? '<a class="btn btn-primary btn-xs ql-remove-button">Remove</a>' : '') + '<br>'+
        '<input type="number" class="ql-button-value ql-metal form-control" value="' + metal + '"> '+
        '<input type="number" class="ql-button-value ql-keys form-control" value="' + keys + '"> '+
        '<input type="number" class="ql-button-value ql-earbuds form-control" value="' + earbuds + '"> '+
        '<br><label class="ql-button-message-label">Message </label> '+
        '<input type="text" class="ql-message form-control" value="' + Page.escapeHtml(message) + '">'+
        '</div>';
}

function selectQuicklist() {
    var selection;
    if (!findSample().length) {
        return window.alert("Create a regular listing first, so the trade offer url can be copied.");
    }

    selection = currentSelection();
    if (!selection.length) {
        return window.alert("No listable items in this selection.");
    }

    var html =
        "<p>Select a preset for this batch of items, or enter one manually. Click on the respective button to fill in the values.</p>"+
        "<div id='ql-cloned-batch' class='row'></div>"+
        "<div id='ql-button-listing' class='row'>";

    values.forEach(function (vals, idx) {
        html += quicklistSelectHtml(vals, idx);
    });

    html += "</div><br>";
    html += quicklistBtnHtml("", "", "", "", false);

    unsafeWindow.modal("List Items", html, '<a class="btn btn-default btn-primary ql-action-button" data-action="listbatch">List Batch</a>');

    $("#ql-cloned-batch").html(selection.clone()).find('.item').addClass('ql-cloned');
    $("#ql-button-listing .ql-select-msg").last().css('margin-bottom', '-8px');
    $(".ql-button-value-idx").tooltip({
        html: false,
        title: function () { return values[$(this).data('idx')].message || "(none)"; },
        placement: 'top'
    });

    Page.addItemPopovers($('.ql-cloned'), $('#ql-cloned-batch'));
}

function addEventListeners() {
    $(document).on('click', '.ql-action-button', onActionButtonClick);
    $('.item:not(.spacer)').click(updateSelectQuicklist);

    $("#bp-custom-select-ql").click(function () {
        if (unsafeWindow.selection_mode) selectQuicklist();
    });
}


function listSelection(value) {
    var selection = currentSelection(),
        sample = findSample(),
        items = [],
        at = 0;

    _clearSelection();
    unsafeWindow.updateClearSelectionState();
    addQuicklistPanelButtons();

    selection.each(function () {
        var $this = $(this);
        items.push($this.data('id'));

        $this.find('.equipped').html('<i class="fa fa-spin fa-spinner"></i>');
    });

    function next() {
        if (!items[at]) return;
        listItem(items[at], value, sample, function () {
            at += 1;
            next();
        });
    }

    next();
}

function listItem(id, value, sample, then) {
    var payload = {
        details: value.message,
        offers: +!!sample.data('listing-offers-url'), // value -> bool -> int
        buyout: sample.data('listing-buyout'),
        tradeoffer_url: sample.data('listing-offers-url'),
        'user-id': Page.csrfToken(),
        metal: value.metal,
        keys: value.keys,
        earbuds: value.earbuds
    };

    // id: current item id
    $.post("http://backpack.tf/classifieds/add/" + id, payload, function (page) {
        var ok = /<i class="fa fa-check-circle"><\/i> Your listing was posted successfully. <\/div>/.test(page),
            item = $('[data-id="' + id + '"]');

        item.css('opacity', 0.6).data('can-sell', 0)
            .find('.equipped').html(ok ? '<i class="fa fa-tag"></i> ' + qlFormatValue(value, false) : '<i class="fa fa-exclamation-circle" style="color:red"></i>');

        if (!ok && !window.confirm("Error occured, continue listing?")) return;
        if (then) then();
    });
}

function collectButtonValues() {
    var elems = $('.ql-button-values'),
        values = [];

    elems.each(function () {
        values.push(buttonValue($(this)));
    });

    return values;
}

function buttonValue(elem) {
    return {
        metal: +(Math.abs(parseFloat(elem.find('.ql-metal').val())).toFixed(2)) || 0,
        keys: Math.abs(parseInt(elem.find('.ql-keys').val(), 10)) || 0,
        earbuds: Math.abs(parseInt(elem.find('.ql-earbuds').val(), 10)) || 0,
        message: elem.find('.ql-message').val() || ""
    };
}

function copyButtonValues(value, elem) {
    var i;

    for (i in value) {
        if (!value.hasOwnProperty(i)) continue;
        elem.find('.ql-' + i).val(value[i] || (i === "message" ? "" : "0"));
    }
}

function modifyQuicklists() {
    var html =
        "<p>Add, edit, and remove quicklist presets here. Metal can have two decimals, keys and earbuds must be integers (no decimals). If any value is missing, it is defaulted to 0, with the exception of the message, which then is empty.</p>"+
        "<div id='ql-button-listing'>";

    values.forEach(function (vals) {
        html += quicklistBtnHtml(vals.metal, vals.keys, vals.earbuds, vals.message);
    });
    html += "</div>"+
        '<a class="btn btn-default ql-add-button">Add</a>';

    unsafeWindow.modal("Modify Quicklist Presets", html, '<a class="btn btn-default btn-primary ql-save-button">Save</a>');

    $('.ql-save-button').click(function () {
        values = collectButtonValues().filter(function (v) {
            return (v.metal || v.keys || v.earbuds) && isFinite(v.metal) && isFinite(v.keys) && isFinite(v.earbuds);
        });

        localStorage.setItem("bes-quicklists", JSON.stringify(values));
        Page.hideModal();
    });

    $('.ql-add-button').click(function () {
        $("#ql-button-listing").append(quicklistBtnHtml("", "", "", ""));
    });

    $('#ql-button-listing').on('click', '.ql-remove-button', function () {
        $(this).parent().remove();
    });
}

function selectItem(element) { element.removeClass('unselected'); }
function unselectItem(element) { element.addClass('unselected'); }

function addSelectPage() {
    function selectItems(items) {
        unsafeWindow.selection_mode = true;
        selectItem(items);

        unsafeWindow.updateClearSelectionState();
        unsafeWindow.calculateValue();
        updateSelectQuicklist();
    }

    $('#backpack').on('click', '.select-page', function () {
        var page = +this.dataset.page,
            pageitems;

        if (page >= 1) {
            pageitems = $('.pagenum[data-page-num="' + page + '"]').nextUntil('.pagenum').not('.spacer').filter(':visible');
        } else { // new items
            pageitems = $('#newlist .item');
        }

        if (!pageitems.length) return;

        if (unsafeWindow.selection_mode) {
            if (pageitems.length === pageitems.not('.unselected').length) { // all == selected
                unselectItem(pageitems);

                if ($('.item:not(.unselected)').length === 0) {
                    _clearSelection();
                    return;
                }
            } else {
                selectItems(pageitems);
            }
        } else {
            unselectItem($('.item'));
            selectItems(pageitems);
        }
    });
}

function _clearSelection() {
    unsafeWindow.clearSelection();
    updateSelectQuicklist();
}

function addSelectPageButtons() {
    $('.pagenum').each(function () {
        var $this = $(this),
            label = $this.find('.page-anchor'),
            page = label[0].id.replace('page', ''),
            sp = $this.find('.select-page');

        if (sp.length) {
            $this.attr('data-page-num', page);
            sp.attr('date-page', page);
            return;
        }

        if (!$this.nextUntil('.pagenum').not('.spacer').filter(':visible').length) return;
        $this.attr('data-page-num', page);
        label.after('<span class="btn btn-primary btn-xs pull-right select-page" data-page="' + page + '" style="margin-right: 16px;">Select Page</span>');
    });
}

function addHooks() {
    $('#clear-selection').click(function () {
        if (!$(this).hasClass('disabled')) {
            updateSelectQuicklist();
        }
    });

    Script.exec("var old_updateMargins = window.updateMargins;"+
                addSelectPageButtons+
                "window.updateMargins = function () { old_updateMargins(); addSelectPageButtons(); }");
}

function load() {
    addStyles();
    loadQuicklists();

    if (Page.isBackpack()) {
        addHooks();
        addSelectPage();
        addSelectPageButtons();
    }

    if (!Page.isUserBackpack() || Page.appid() !== 440 || !Prefs.enabled('quicklist')) return;

    addQuicklistPanelButtons();
    addEventListeners();
}

module.exports = load;
module.exports.modifyQuicklists = modifyQuicklists;
