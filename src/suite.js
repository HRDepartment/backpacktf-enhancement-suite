var Prefs = require('./preferences'),
    Page = require('./page');

Page.init();
require('./api').init();

Prefs
    .default('reptf', 'enabled', true)
    .default('quicklist', 'enabled', false)
    .default('pricetags', 'earbuds', true)
    .default('pricetags', 'modmult', 0.5)
    .default('pricetags', 'tooltips', true)
    .default('changes', 'enabled', true)
    .default('changes', 'period', (1000 * 60 * 60 * 24)) // 1 day
    .default('pricing', 'step', EconCC.Disabled)
    .default('pricing', 'range', EconCC.Range.Mid)
    .default('lotto', 'show', true)
    .default('notifications', 'updatecount', 'click')
    .default('classifieds', 'signature', '')
    .default('classifieds', 'autoclose', true)
;

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
exec(require('./components/improvements'));
exec(require('./components/users'));

require('./menu-actions').applyActions();
Page.addTooltips();

Page.loaded = true;
