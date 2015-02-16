"use strict";

var common = (function(self) {

    self.toplevel = window.location.origin;

    self.assert = function(cond, message) {
        if (!cond) {
            message = message || "Assertion faled.";
            var err = new Error(message);
            console.log(err);
            throw err;
        }
    };

    self.assert_defined = function(val, msg) {
        self.assert(typeof val != "undefined", msg || "Undefined value");
    };


    self.getQueryParameter = function(name) {
        var m = RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
        return m && decodeURIComponent(m[1].replace(/\+/g, " "));
    };

    self.encodeQueryParameters = function(keyvals) {
        var qs = Object.keys(keyvals).map(function(key) {
            return [key, keyvals[key]].map(encodeURIComponent).join("=");
        }).join("&");
        return qs;
    }

    self.getMouseEventPos = function(ev, $relative_to) {
        var oev = ev.originalEvent;
        var x = oev.offsetX || oev.layerX;
        var y = oev.offsetY || oev.layerY;
        if ($relative_to) {
            var offset = $relative_to.offset();
            x = x - offset.left;
            y = y - offset.top;
        }
        return [x, y];
    };


    var includedScriptFiles = {};
    self.includeScript = function(src) {
        if (includedScriptFiles[src]) { return; }
        var k = $('head')
            .append($('<script>')
                    .attr({type:'text/javascript', src:src}));
        includedScriptFiles[src] = true;
     };

    return self;

})({});

