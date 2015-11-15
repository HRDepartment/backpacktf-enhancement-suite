var Search, unusualPage;

function request(query, scope, search) {
    if (unusualPage) return render(unusualPage, search);

    Search.request({url: 'https://backpack.tf/unusuals', method: "GET"}, function (response) {
        render(unusualPage = parse(response), search);
    });
}

function parse(content) {
    var html = $($.parseHTML(content));
    return html.find('.item').map(function () {
        var img = this.querySelector('.item-icon').style.backgroundImage;
        this.dataset.imgurl = img.substring(img.indexOf('(') + 1, img.indexOf(')'));
        this.dataset.avg = this.querySelector('.tag.bottom-right').innerText;
        return JSON.parse(JSON.stringify(this.dataset));  // force document garbage collection, saves ~15mb of ram
    }).toArray();
}

function render(unusuals, search) {
    var searchbox = $('.site-search-dropdown'),
        regex = new RegExp(search, "i"),
        html = '',
        matches = [],
        data, i;

    searchbox.empty();
    for (i = 0; i < unusuals.length; i += 1) {
        data = unusuals[i];
        if (regex.test(data.name)) {
            matches.push(data);

            if (matches.length === 10) break;
        }
    }

    if (!matches.length) {
        return searchbox.append('<li class="header">No matches</li>');
    }

    matches.sort(function (a, b) {
        return +b.price - +a.price;
    }).forEach(function (data) {
        var colors = Search.apps.qualities[440].qualities[data.qName],
            colorStyle = 'border-color:' + colors[1] + ';background-color:' + colors[0];

        html +=
        '<li class="mini-price"><div class="item-mini"><img src="' + data.imgurl + '"></div><div class="item-name">' + data.name + '</div><div class="buttons">'+
        '<a href="/unusuals/' + data.name + '" class="btn btn-xs" style="' + colorStyle + '">' + data.avg + '</a>'+
        '<a href="' + data.listingUrl + '" class="btn btn-xs" style="' + colorStyle + '">Classifieds</a>'+
        '</div></li>';
    });

    searchbox.append(html);
}

exports.register = function (s) {
    Search = s;
    s.register(["unusuals", "unusual", "u"], {load: request, render: render});
    s.hint("Unusual price indices", "Type u: followed by the name of the item.");
};
