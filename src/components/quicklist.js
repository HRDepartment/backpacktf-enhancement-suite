var Page = require('../page'),
    Script = require('../script'),
    DataStore = require('../datastore'),
    Prefs = require('../preferences');

var currencyNames = {"long":{"keys":["key","keys"],"metal":["ref","ref"]},"short":{"keys":["k","k"],"metal":["r","r"]}},
    defaults = [
        {metal: 0.05, keys: 0,  message: ""},
        {metal: 0.11, keys: 0, message: ""},
        {metal: 0, keys: 1, message: ""}
    ],
    values;

function loadQuicklists() {
    var customlists = DataStore.getItem("bes-quicklists");

    if (customlists) {
        values = JSON.parse(customlists);
    } else {
        values = defaults;
        DataStore.setItem("bes-quicklists", JSON.stringify(values));
    }
}

function addQuicklistPanelButtons() {
    $('#show-markdown-modal').before(' <a id="bp-custom-select-ql" class="btn btn-default btn-primary btn-xs disabled" href="##">Quicklist selection</a>');
}

function updateSelectQuicklist() {
    $("#bp-custom-select-ql").toggleClass("disabled", !Page.bp().selectionMode);
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

    if (value.keys) str.push(value.keys + space + cnames.keys[+(value.keys !== 1)]);
    if (value.metal) str.push(value.metal + space + cnames.metal[+(value.metal !== 1)]);
    return str.join(', ');
}

function addStyles() {
    Page.addStyle(
        ".ql-button-value-idx { margin-right: 3px; }"
    );
}

function quicklistSelectHtml(value, idx) {
    return '<a class="btn btn-primary ql-button-value-idx ql-action-button" data-action="select" data-idx="' + idx + '" style="margin-right: 3px;">' + qlFormatValue(value, true) + '</a>';
}

function quicklistBtnHtml(metal, keys, message, remove) {
    return '<div class="ql-button-values">'+
        '<div class="row">'+
            '<div class="col-md-3"><label>Metal</label>'+
            '<input type="text" placeholder="0" class="col-md-3 ql-metal form-control" value="' + metal + '"></div>'+
            '<div class="col-md-3"><label>Keys</label>'+
            '<input type="text" placeholder="0" class="col-md-3 ql-keys form-control" value="' + keys + '"></div>'+
        (remove !== false ? '<a class="btn btn-primary btn-xs ql-remove-button">Remove</a>' : '')+
        '</div>'+
        '<div class="row">'+
            '<div class="col-md-12"><label>Message</label>'+
            '<input type="text" class="col-md-3 form-control ql-message" value="' + Page.escapeHtml(message) + '"></div>'+
        '</div>'+
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
        if (Page.bp().selectionMode) selectQuicklist();
    });
}


function listSelection(value) {
    var selection = currentSelection(),
        sample = findSample(),
        items = [],
        at = 0;

    _clearSelection();
    Page.bp().updateClearSelectionState();

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
        currencies: {
            metal: value.metal,
            keys: value.keys
        }
    };

    // id: current item id
    $.post("http://backpack.tf/classifieds/sell/" + id, payload, function (page) {
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
        "<p>Add, edit, and remove quicklist presets here. Metal can have two decimals, keys must be integers (no decimals). If any value is missing, it is defaulted to 0, with the exception of the message, which then is empty.</p>"+
        "<div id='ql-button-listing'>";

    values.forEach(function (vals) {
        html += quicklistBtnHtml(vals.metal, vals.keys, vals.message);
    });
    html += "</div>"+
        '<a class="btn btn-default ql-add-button">Add</a>';

    unsafeWindow.modal("Modify Quicklist Presets", html, '<a class="btn btn-default btn-primary ql-save-button">Save</a>');

    $('.ql-save-button').click(function () {
        values = collectButtonValues().filter(function (v) {
            return (v.metal || v.keys) && isFinite(v.metal) && isFinite(v.keys);
        });

        DataStore.setItem("bes-quicklists", JSON.stringify(values));
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
    var backpack = Page.bp();

    function selectItems(items) {
        backpack.selectionMode = true;
        selectItem(items);

        backpack.updateClearSelectionState();
        backpack.updateValues();
        updateSelectQuicklist();
    }

    $('#backpack').on('click', '.select-page', function () {
        var pageitems = $(this).closest('.backpack-page').find('.item').not('.spacer').filter(':visible');

        if (!pageitems.length) return;

        if (backpack.selectionMode) {
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
    Page.bp().clearSelection();
    updateSelectQuicklist();
}

function addSelectPageButtons() {
    $('.page-number').each(function () {
        var $this = $(this),
            label = $this.find('.page-anchor'),
            page, sp;

        if (!label[0]) return;
        sp = $this.find('.select-page');

        if (sp.length) {
            return;
        }

        if (!$this.nextUntil('.page-number').not('.spacer').filter(':visible').length) return;
        label.after('<span class="btn btn-primary btn-xs pull-right select-page" style="margin-right: 2.7%;margin-top: -0.1%;">Select Page</span>');
    });
}

function addHooks() {
    $('#clear-selection').click(function () {
        if (!$(this).hasClass('disabled')) {
            updateSelectQuicklist();
        }
    });

    Script.exec("var old_updateDisplay = window.backpack.updateDisplay;"+
                addSelectPageButtons+
                "window.backpack.updateDisplay = function () { old_updateDisplay.call(this); addSelectPageButtons(); }");
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
