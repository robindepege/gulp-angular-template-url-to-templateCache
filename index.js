var _fs = require('fs'),
    _es = require('event-stream'),
    _opt;

String.prototype.endWith = function (suffix) {
    return (this.indexOf(suffix, this.length - suffix.length) !== -1)
}

String.prototype.startWith = function (preffix) {
    return (this.indexOf(preffix, 0) !== -1)
}

String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/gm, '');
}

module.exports = function (options) {
    _opt = options;

    //---
    var cb = function (file, callback) {
        var body = file.contents.toString();

        body = replace(body);

        file.contents = new Buffer(body);

        //---
        return callback(null, file);
    }

    //---
    return _es.map(cb);
}

function replace(body) {
    var t = getByExt(body);
    body = t[0];

    var tc = t[1];

    var s = "";
    for (var i = 0, l = tc.length; i < l; i++) {
        var o = tc[i];

        s += "$templateCache.put(" + o.k + ", " + o.t + ");\r\n";
    }

    body = body.replace("//@@build_$templateCache", s);

    //---
    return body;
}

function loadTemplate(url) {
    var s = _fs.readFileSync(url, 'utf8')
        .replace(/[\\']/g, '\\$&').replace(/\u0000/g, '\\0')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s{2,}/g, '')
        .replace(/\n/g, '');

    //---
    return s.substring(1, s.length);
}

function getByExt(body) {
    var e = ""

    if (_opt.exts instanceof Array) {
        e += "(";
        _opt.exts.forEach(function (l) {
            e += "(\\" + l + ")|"
        });
        e = e.substring(0, e.length - 1);
        e += ")";
    }
    else {
        e = "(\\" + _opt.exts + ")";
    }

    var r = new RegExp("(\"|')((.*?)" + e + ")(\"|')", "g");

    var $templateCache = [];

    var body = body.replace(r, function (s) {
        var url = s.trim(),
            suff = url.endWith(',') ? 2 : 1,
            last = url.substring(url.length - suff);

        url = url.substring(1, url.length - suff);

        var ind = url.lastIndexOf(last);
        var before = "";
        if (ind > -1) {
            before = s.substring(0, ind + 1);
            url = url.substring(ind + 1, url.length);
        }

        var key = url.replace(/[\/.-]/g, "_");
        key = "'_" + key.substring(0, key.lastIndexOf("_")+1) + ".html'";

        if (_opt.from) {
            var from = _opt.from.endWith('/') ? _opt.from : _opt.from + '/';

            url = from + url;
        }

        $templateCache.push({
            k:key, 
            t: "'" + loadTemplate(url) + "'"
        });

        return before + key;
    });

    return [body, $templateCache];
}
