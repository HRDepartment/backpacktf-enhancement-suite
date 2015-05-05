var Page = require('../page'),
    Script = require('../script'),
    Prefs = require('../preferences'),
    Pricetags = require('./pricetags');

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
    var signature = Prefs.pref('classifieds', 'signature');

    $('#page-content .row:eq(1)').before(htm);
    $("#classifieds-peek").one('click', peek);
    $("#details").val(signature);
    Script.exec('$("#details").trigger("blur");');
}

function checkAutoclose() {
    if (Prefs.pref('classifieds', 'autoclose') &&
        /Your listing was posted successfully/.test($('.alert-success').text())) {
        window.close();
    }
}


function load() {
    page('/classifieds/add/:id', add);
    page('/classifieds/', checkAutoclose);
}

module.exports = load;
