var Prefs = require('./preferences'),
    Page = require('./page');

// Not a valid page, don't do anything
if (typeof unsafeWindow.$ !== 'function' || typeof unsafeWindow.$() === 'undefined') return;

Page.init();
require('./api').init();

Prefs.defaults({
    reptf: {enabled: true},
    quicklist: {enabled: false},
    lotto: {show: true},
    notifications: {updatecount: 'click'},
    pricetags: {
        modmult: 0.5,
        tooltips: true,
    },
    changes: {
        enabled: true,
        outdatedwarn: true,
        period: 1000 * 60 * 60 * 24 // 1d
    },
    pricing: {
        step: EconCC.Disabled,
        range: EconCC.Range.Mid
    },
    classifieds: {
        signature: '',
        'signature-buy': '',
        autoclose: true,
        autofill: 'default'
    },
    homebg: {
        image: '',
        repeat: 'no-repeat',
        posy: 'top',
        posx: 'center',
        attachment: 'scroll',
        sizing: 'contain'
    },
    other: {
        originalkeys: false
    }
});

function exec(mod) {
    mod();
    mod.initialized = true;
}

if (Prefs.enabled('reptf')) exec(require('./components/reptf'));
exec(require('./components/quicklist')); // prefs checked inside main
exec(require('./components/pricetags'));
if (Prefs.enabled('changes')) exec(require('./components/changes'));
exec(require('./components/refresh'));
exec(require('./components/classifieds'));
exec(require('./components/prefs'));
exec(require('./components/search'));
exec(require('./components/dupes'));
exec(require('./components/improvements'));
exec(require('./components/users'));

require('./menu-actions').applyActions();
Page.addTooltips();

$(document).off('click.bs.button.data-api'); // Fix for bootstrap
Page.loaded = true;
