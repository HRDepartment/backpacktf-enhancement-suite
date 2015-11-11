/*!
 * backpack.tf Enhancement Suite - enhancing your backpack.tf experience
 * Made by cares <http://steamcommunity.com/id/caresx>
 *
 * Post feedback + view instuctions:
   http://forums.backpack.tf/index.php?/topic/36130-backpacktf-enhancement-suite/
 * Browse the source code: https://github.com/caresx/backpacktf-enhancement-suite
 * Changelog:
   https://github.com/caresx/backpacktf-enhancement-suite/blob/gh-pages/CHANGELOG.md
 *
 * Edit your preferences: http://backpack.tf/my/preferences##bes
 */

var Prefs = require('./preferences'),
    Page = require('./page');

// Ignore non-html pages
if (!document.getElementById("helpers")) return;

Page.init();
require('./api').init();

Prefs.defaults({
    reptf: {enabled: true},
    quicklist: {enabled: true},
    lotto: {show: true},
    notifications: {updatecount: 'click'},
    pricetags: {
        modmult: 0.5,
        tooltips: true
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
        attachment: 'fixed',
        sizing: 'cover',
        replacewalls: true
    },
    other: {
        originalkeys: false,
        thirdpartyprices: true
    }
});

function exec(mod) {
    mod();
    mod.initialized = true;
}

exec(require('./components/improvements'));
if (Prefs.enabled('reptf')) exec(require('./components/reptf'));
exec(require('./components/quicklist')); // prefs checked inside main
exec(require('./components/pricetags'));
if (Prefs.enabled('changes')) exec(require('./components/changes'));
exec(require('./components/refresh'));
exec(require('./components/classifieds'));
exec(require('./components/prefs'));
exec(require('./components/search'));
exec(require('./components/dupes'));
exec(require('./components/users'));

require('./menu-actions').applyActions();
Page.addTooltips();

$(document).off('click.bs.button.data-api'); // Fix for bootstrap
Page.loaded = true;
