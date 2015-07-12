exports.setItem = function (name, value) {
    return GM_setValue(name, value);
};

exports.getItem = function (name) {
    var lsItem = localStorage.getItem(name);

    // Migrate to GM storage for cross subdomain storage
    if (lsItem) {
        GM_setValue(name, lsItem);
        localStorage.removeItem(name);
        return lsItem;
    }

    return GM_getValue(name);
};

exports.removeItem = function (name) {
    return GM_deleteValue(name);
};
