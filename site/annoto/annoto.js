"use strict";

window.annoto = window.annoto || (function(self, $) {
    return self;
})({}, jQuery);

window.annoto.plugins = window.annoto.plugins || (function(self, $) {
    self.Plugin = (function() {
        var cls = function(data) {
            var T = this;
            T.view = null;
        };

        cls.prototype.setup = function(view) {
            var T = this;
            T.view = view;
            T.on_setup();
        };

        cls.prototype.on_setup = function() {
            // To be overrided
        };

        return cls;
    })();

    return self;
})({}, jQuery);

