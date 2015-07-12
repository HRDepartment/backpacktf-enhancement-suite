var Prefs = require('../preferences'),
    Page = require('../page'),
    Quicklist = require('./quicklist'),
    DataStore = require('../datastore'),
    Cache = require('../cache');

function addTab() {
    $("#settings-tabs").append('<li><a href="#bes">Enhancement Suite</a></li>');
    $('#settings-tabs [href="#bes"]').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
}

function addTabContent() {
    function section(name, fields) {
        return [
            '<section>',
            '<h4>' + name + '</h4>',
            fields.join(""),
            '</section>'
        ].join("");
    }

    function buttons(name, component, key, bts) {
        return [
            '<div class="form-group">',
            '<label>' + name + '</label>',
            '<div class="btn-group" data-toggle="buttons" data-component="' + component + '" data-key="' + key + '">',
            bts,
            '</div>',
            '</div>'
        ].join("");
    }

    function button(text, id, fields) {
        return [
            '<div class="form-group">',
            '<a class="btn btn-primary"' + (id ? ' id="' + id + '"' : '') + '>' + text + '</a>',
            fields || "",
            '</div>'
        ].join("");
    }

    function userInput(label, component, key, value, placeholder) {
        return [
            '<div class="form-group">',
            '<label>' + label + '</label>',
            '<input type="text" class="form-control active" value="' + Page.escapeHtml(value || "") + '" placeholder="' + Page.escapeHtml(placeholder || "") + '" data-component="' + component + '" data-key="' + key + '">',
            '</div>',
        ].join("");
    }

    function yesno(yes, labels) {
        labels = labels || ["Yes", "No"];

        return [
            '<label class="btn btn-primary' + (yes ? ' active' : '') + '"><input type="radio" value="true"' + (yes ? ' checked' : '') + '>' + labels[0] + '</label>',
            '<label class="btn btn-primary' + (yes ? '' : ' active') + '"><input type="radio" value="false"' + (yes ? '' : ' checked') + '>' + labels[1] + '</label>'
        ].join("");
    }


    function buttonsyn(name, component, key) {
        return buttons(name, component, key, yesno(Prefs.pref(component, key)));
    }

    function userInputp(label, component, key, placeholder) {
        return userInput(label, component, key, Prefs.pref(component, key), placeholder);
    }

    function buttonsChoice(name, component, key, choices) {
        return buttons(name, component, key, choice(choices, Prefs.pref(component, key)));
    }

    function choice(choices, active) {
        var html = "";

        choices.forEach(function (choice) {
            html += '<label class="btn btn-primary' + (choice.value === active ? ' active' : '') + '"><input type="radio" value="' + choice.value + '"' + (choice.value === active ? ' checked' : '') + '>' + choice.label + '</label>';
        });

        return html;
    }

    function help(text) {
        return '<span class="help-block">' + text + '</span>';
    }

    var html = [
        '<div class="tab-pane" id="bes">',

        '<h3>backpack.tf Enhancement Suite <span class="text-muted">v' + Page.SUITE_VERSION + '</span></h3>',
        '<div class="padded">',

        buttonsChoice('Notifications widget', 'notifications', 'updatecount', [
            {value: 'no', label: 'No'},
            {value: 'click', label: 'Notification click'},
            {value: 'listing', label: 'Removed listing'},
            {value: 'load', label: 'Always'},
        ]),
        help("Requires you to have donated and disabled ads in favor of the notifications widget (Awesome perks tab). This setting applies only to the notifications widget which is on the site index page. Updates the notifications count badge when a notification is clicked, when you have a [removed listing] notification, or always."),

        section('Classifieds', [
            userInputp('Sell order signature', 'classifieds', 'signature'),
            help("Message automatically inserted in the 'Message' field of Classified sell order listings you create manually."),
            userInputp('Buy order signature', 'classifieds', 'signature-buy', Prefs.pref('classifieds', 'signature-buy')),
            help("Message automatically inserted in the 'Message' field of Classified buy order listings you create manually."),
            buttonsyn('Auto-close when listed successfully', 'classifieds', 'autoclose'),
            help("Automatically close the page you get (your Classifieds listings) whenever you successfully post a Classifieds listing manually. (Chrome only)"),
            buttonsChoice('Auto-fill price', 'classifieds', 'autofill', [
                {value: 'backpack', label: 'backpack.tf'},
                {value: 'lowestauto', label: "Lowest automatic listing"},
                {value: 'lowest', label: "Lowest listing"},
                {value: 'default', label: 'Disabled'},
            ]),
            help("Price to be used for new sell listings. Pricing and pricetag options (range, modifications) will be used to determine the backpack.tf price. The lowest listing is determined whenever peek is used manually. For those options, if there are no (automatic) listings, nothing will be auto-filled."),
        ]),

        section('Classifieds quicklisting', [
            buttonsyn('Enabled', 'quicklist', 'enabled'),
            help("Adds Select Page buttons to your profile. Once you have selected some items, click on the 'Quicklist selection' button. You can select a pre-defined price/message (click the button below) or enter them on the spot. The items will be listed sequentially with the price and message you provided. Only Team Fortress 2 is supported."),
            button('Modify Presets', 'modify-quicklists')
        ]),

        section('rep.tf integration', [
            buttonsyn('Enabled', 'reptf', 'enabled'),
            help("Adds a rep.tf button to mini profiles and profile pages. Easily check a user's rep.tf bans by going to their profile page. The + next to Community will be green (clean) or red (has bans). Click on it to see who issued the bans and their reasoning.")
        ]),

        section('Pricing', [
            help("These options are used by Pricetags and Recent price changes in backpacks."),

            buttonsChoice('Price range', 'pricing', 'range', [
                {value: EconCC.Range.Low, label: 'Low-end'},
                {value: EconCC.Range.Mid, label: 'Mid (avg)'},
                {value: EconCC.Range.High, label: 'High-end'},
            ]),
            help("Price range to be used."),

            buttonsChoice('Currency step', 'pricing', 'step', [
                {value: EconCC.Enabled, label: 'Enabled'},
                {value: EconCC.Disabled, label: 'Disabled'}
            ]),
            help("Whether currency values should be 'prettified'. Metal is rounded to the nearest weapon (except when the value is less than one), and keys are rounded to the nearest 20th. (1.40 ref -> 1.38, 2.27 keys -> 2.25 keys)"),
        ]),

        section('Pricetags', [
            help("This section requires your 'Item pricetags' (Team Fortress 2 tab) to be 'Game currency'. Only Team Fortress 2 is supported obviously."),

            buttonsChoice('Value item modifications at', 'pricetags', 'modmult', [
                {value: 0, label: '0%'},
                {value: 0.05, label: '5%'},
                {value: 0.1, label: '10%'},
                {value: 0.2, label: '20%'},
                {value: 0.25, label: '25%'},
                {value: 0.3, label: '30%'},
                {value: 0.4, label: '40%'},
                {value: 0.5, label: '50%'}
            ]),
            help("Strange Parts, Paint."),

            buttonsyn('Tooltips', 'pricetags', 'tooltips'),
            help("Adds tooltips to items that are priced in keys."),
        ]),

        section('Recent price changes in backpacks', [
            buttonsyn('Enabled', 'changes', 'enabled'),
            help("Shows recent price changes on backpack pages you visit."),

            buttonsChoice('Price change period', 'changes', 'period', [
                {value: (1000 * 60 * 60 * 8), label: '8 hours'},
                {value: (1000 * 60 * 60 * 24), label: '1 day'},
                {value: (1000 * 60 * 60 * 24 * 3), label: '3 days'},
                {value: (1000 * 60 * 60 * 24 * 5), label: '5 days'},
                {value: (1000 * 60 * 60 * 24 * 7), label: '1 week'},
            ]),

            buttonsyn('Outdated unusual warnings', 'changes', 'outdatedwarn'),
            help("Shows an warning icon on outdated unusuals (ones that were updated more than 3 months ago.) Price changes must be enabled for this feature."),
        ]),

        section('Custom homepage background', [
            userInputp('Background image url', 'homebg', 'image'),
            help("Leave blank to disable this feature. You can also link to a raw pastebin so an image can be chosen at random <a href='http://pastebin.com/raw.php?i=8CVW6S2z'>(example)</a>. Separate image urls with a newline. Images will share the same options so pick similar ones."),

            buttonsChoice('Background repeat', 'homebg', 'repeat', [
                {value: 'no-repeat', label: "Don't repeat"},
                {value: 'repeat', label: "Tiled"},
                {value: 'repeat-x', label: 'Repeat horizontally'},
                {value: 'repeat-y', label: 'Repeat veritcally'},
            ]),

            buttonsChoice('Background veritcal position', 'homebg', 'posy', [
                {value: 'top', label: "Top"},
                {value: 'center', label: "Center"},
                {value: 'bottom', label: "Bottom"},
            ]),

            buttonsChoice('Background horizontal position', 'homebg', 'posx', [
                {value: 'left', label: "Left"},
                {value: 'center', label: "Center"},
                {value: 'right', label: "Right"},
            ]),

            buttonsChoice('Background attachment', 'homebg', 'attachment', [
                {value: 'scroll', label: "Scroll with page"},
                {value: 'fixed', label: "Fixed"},
            ]),

            buttonsChoice('Background sizing', 'homebg', 'sizing', [
                {value: 'none', label: "None"},
                {value: 'cover', label: "Fill"},
                {value: 'contain', label: "Contain"},
            ]),

            buttonsyn('Replace all walls', 'homebg', 'replacewalls'),
            help("Replaces the default wall image with your background image url."),
        ]),

        section('Other', [
            help("Preferences that don't deserve their own section."),

            buttonsyn('Show lotto', 'lotto', 'show'),
            help("Shows or hides the lotto on the main page. It can still be viewed at <a href='/lotto'>backpack.tf/lotto</a>."),

            buttonsyn('Use original key icons', 'other', 'originalkeys'),
            help("Shows the original key's icon (for converted event keys) full size.")
        ]),

        section('Advanced', [
            button('Reset preferences', 'reset-prefs'),
            help('Resets your preferences (including quicklists) to the default and reloades the page.'),

            button('Clear cache', 'clear-cache'),
            help('Clears all caches. Use this if you are advised to. Clicking this button will reload the page and all your unsaved changes will be lost.'),
        ]),

        '</div>',
        '</div>'
    ].join('');

    $('#settings-panes .tab-content').append(html);
    $('#modify-quicklists').click(Quicklist.modifyQuicklists);
    $('#clear-cache').click(clearCache);
    $('#reset-prefs').click(resetPrefs);

    $('#bes').on('click.bs.button.data-api', '[data-toggle^="button"]', function (e) {
        var $btn = $(e.target);
        if (!$btn.hasClass('btn')) {
            $btn = $btn.closest('.btn');
        }

        $.fn.button.call($btn, 'toggle');

        if (!($(e.target).is('input[type="radio"]') || $(e.target).is('input[type="checkbox"]'))) {
            e.preventDefault();
        }
    });
}

function clearCache() {
    Cache.names.forEach(function (name) {
        DataStore.removeItem(name);
    });

    DataStore.removeItem("backpackapikey");
    location.reload();
}

function resetPrefs() {
    DataStore.removeItem("bes-preferences");
    DataStore.removeItem("bes-quicklists");
    location.reload();
}

function addHotlinking() {
    if (location.hash) {
        $('[href="#' + location.hash.replace(/#/g, '') + '"]').tab('show');
    }

    $('#settings-tabs a').click(function () {
        location.hash = '#' + this.href.substr(this.href.indexOf('#'));
    });
}

function getSettings() {
    var opts = $('#bes .active'),
        settings = {};

    opts.each(function () {
        var $this = $(this),
            component, key, value, v;

        if (!$this.data('component')) $this = $this.parent();
        component = $this.data('component');
        key = $this.data('key');
        value = $this.hasClass('active') ? $this.val() : $this.find('.active [value]').val();

        try {
            v = JSON.parse(value);
        } catch (ex) {
            v = value;
        }

        settings[component] = settings[component] || {};
        settings[component][key] = v;
    });

    return settings;
}

function addSaveButton() {
    var saveButton = $('.panel-body-alt input[type="submit"]');

    saveButton.click(function (e) {
        e.preventDefault();
        saveButton.val('Saving...').addClass('disabled');

        Prefs.applyPrefs(getSettings());
        $.post("/my/preferences_save", $("form[action='/my/preferences_save']").serialize(), function () {
            saveButton.val('Save Settings').removeClass('disabled');
        });
    });
}

function load() {
    if (location.pathname !== '/my/preferences') return;

    addTab();
    addTabContent();
    addHotlinking();
    addSaveButton();
}

module.exports = load;
