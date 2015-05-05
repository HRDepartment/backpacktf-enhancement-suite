exports.exec = function (code) {
    var scr = document.createElement('script'),
        elem = (document.body || document.head || document.documentElement);
    scr.textContent = code;

    elem.appendChild(scr);
    elem.removeChild(scr);
};
