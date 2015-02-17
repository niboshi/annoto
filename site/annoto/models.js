"use strict";

common.includeScript("annoto/annoto.js");

window.annoto.models = window.annoto.models || (function(self, $) {
    var __model_name_to_cls = {};

    self.register = function(model_name, model_cls) {
        // Call this function after model's prototype is initialized with its base class.
        model_cls.prototype.__annoto_model_name = model_name;
        __model_name_to_cls[model_name] = model_cls;
    };

    self.model_name_to_cls = function(name) {
        var cls = __model_name_to_cls[name];
        common.assert(cls, ["name:", name]);
        return cls;
    };

    self.Model = (function() {
        var cls = function () {
            var T = this;

            // Styles
            T.line_width = 3.0;
        };

        cls.prototype.process_input = function(type, data) {
            // Returns true if this model has been finished.
            //
            var T = this;
            return T.process_input_impl(type, data);
        };

        cls.prototype.process_input_impl = function(type, data) {
            return false;
        };

        cls.prototype.get_model_name = function() {
            // Do not override this.
            var T = this;
            var name = T.__annoto_model_name;
            common.assert(T.__annoto_model_name, "Register the model by calling annoto.models.register().");
            return name;
        };

        cls.prototype.get_model_data = function() {
            return null;
        };

        cls.prototype.set_model_data = function(model_data) {
        };

        cls.prototype.draw = function(ctx, data) {
        };

        return cls;
    })();

    self.NestedModel = (function() {
        var cls = function() {
            var T = this;
            self.Model.call(T);

            // Instances of models that have been finished.
            T.finished_models = [];

            // The current model that is active.
            T.current_model = null;
        };

        cls.prototype = new self.Model();

        cls.prototype.process_input_impl = function(type, data) {
            // Returns true if this model has been finished.
            //
            var T = this;

            var current_model = T.current_model;
            if (current_model) {
                var ret = current_model.process_input(type, data);

                if (ret) {
                    T.finished_models.push(current_model);
                    var next_model = T.on_inner_model_finish(current_model);
                    T.current_model = next_model;
                    if (next_model) {
                        return false;
                    } else {
                        return true;
                    }
                }
            }

            return false;
        };

        cls.prototype.get_model_data = function() {
            var T = this;
            var d_finished = [];
            var models = [].concat(T.finished_models, [T.current_model]);
            for (var i = 0; i < models.length; ++i) {
                var model = models[i];
                if (model == null) {
                    continue;
                }
                var model_name = model.get_model_name();
                var model_data = model.get_model_data();
                var d = {
                    "name": model_name,
                    "data": model_data,
                };
                if (model == T.current_model) {
                    d["current"] = true;
                }
                console.log(d);
                d_finished.push(d);
            }
            return d_finished;
        };

        cls.prototype.set_model_data = function(model_data) {
            var T = this;
            T.finished_models = [];
            T.current_model = null;
            for (var i = 0; i < model_data.length; ++i) {
                var d = model_data[i];
                var cls = self.model_name_to_cls(d.name);
                var model = new cls();
                model.set_model_data(d.data);
                T.finished_models.push(model);
                if (d.current) {
                    T.current_model = model;
                }
            }
        };

        cls.prototype.on_inner_model_finish = function(prev_model) {
            // Subclass should override this method so that it returns the next model if any.
            //
            return null;
        };

        cls.prototype.draw = function(ctx, data) {
            var T = this;

            ctx.strokeStyle = "#00ff00";
            for (var i = 0; i < T.finished_models.length; ++i) {
                T.finished_models[i].draw(ctx, data);
            }

            if (T.current_model) {
                T.current_model.draw(ctx, data);
            }
        };

        return cls;
    })();

    self.SegmentModel = (function() {
        var cls = function() {
            var T = this;
            self.Model.call(T);

            T.p1 = null;
            T.p2 = null;
        };

        cls.prototype = new self.Model();
        self.register("segment", cls);

        cls.prototype.process_input_impl = function(type, data) {
            var T = this;
            if (type == "point") {
                var pt = [data.x, data.y];
                if (T.p1 == null) {
                    T.p1 = pt;
                } else if (T.p2 == null) {
                    T.p2 = pt;
                } else {
                    common.assert(false);
                }

                if (T.p2 != null) {
                    data.need_redraw = true;
                    return true;
                }
            } else if (type == "move") {
                if (T.p1 != null && T.p2 == null) {
                    data.need_redraw = true;
                }
            }
            return false;
        };

        cls.prototype.get_model_data = function() {
            var T = this;
            return [T.p1, T.p2];
        };

        cls.prototype.set_model_data = function(model_data) {
            var T = this;
            T.p1 = model_data[0];
            T.p2 = model_data[1];
        };

        cls.prototype.draw = function(ctx, data) {
            var T = this;
            var p1 = T.p1;
            var p2 = T.p2 || data.mousePos;
            if (p1 && p2) {
                var color = T.p2 ? "#000000" : "#ffff00";
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(p1[0], p1[1]);
                ctx.lineTo(p2[0], p2[1]);
                ctx.lineWidth = T.line_width / data.scale;
                ctx.strokeStyle = color;
                ctx.stroke();
                ctx.restore();
            }
        };

        return cls;
    })();

    self.RectangleModel = (function() {
        var cls = function() {
            var T = this;
            self.Model.call(T);

            T.p1 = null;
            T.p2 = null;
        };

        cls.prototype = new self.Model();
        self.register("rect", cls);

        cls.prototype.process_input_impl = function(type, data) {
            var T = this;
            if (type == "point") {
                var pt = [data.x, data.y];
                if (T.p1 == null) {
                    T.p1 = pt;
                } else if (T.p2 == null) {
                    T.p2 = pt;
                } else {
                    common.assert(false);
                }

                if (T.p2 != null) {
                    data.need_redraw = true;
                    return true;
                }
            } else if (type == "move") {
                if (T.p1 != null && T.p2 == null) {
                    data.need_redraw = true;
                }
            }
            return false;
        };

        cls.prototype.get_model_data = function() {
            var T = this;
            if (T.p1 && T.p2) {
                var x = Math.min(T.p1[0], T.p2[0]);
                var y = Math.min(T.p1[1], T.p2[1]);
                var w = Math.abs(T.p2[0] - T.p1[0]);
                var h = Math.abs(T.p2[1] - T.p1[1]);
                return [x, y, w, h];
            } else {
                return null;
            }
        };

        cls.prototype.set_model_data = function(model_data) {
            var T = this;
            if (model_data == null) {
                T.p1 = T.p2 = null;
            } else {
                var m = model_data;
                T.p1 = [m[0], m[1]];
                T.p2 = [m[0] + m[2], m[1] + m[3]];
            }
        };


        cls.prototype.draw = function(ctx, data) {
            var T = this;
            var p1 = T.p1;
            var p2 = T.p2 || data.mousePos;

            if (p1 && p2) {
                var color = T.p2 ? "#000000" : "#ffff00";
                var x = Math.min(p1[0], p2[0]);
                var y = Math.min(p1[1], p2[1]);
                var w = Math.abs(p2[0] - p1[0]);
                var h = Math.abs(p2[1] - p1[1]);
                ctx.save();
                ctx.lineWidth = T.line_width / data.scale;
                ctx.strokeStyle = color;
                ctx.strokeRect(x, y, w, h);
                ctx.restore();
            }
        };

        return cls;
    })();

    self.RepetitiveModel = (function() {
        function cls(model_cls) {
            common.assert_defined(model_cls, "model_cls");

            var T = this;
            self.NestedModel.call(T);

            T.model_cls = model_cls;
            T.current_model = new model_cls();
        }

        cls.prototype = new self.NestedModel();

        cls.prototype.on_inner_model_finish = function(prev_model) {
            var T = this;
            return new T.model_cls();
        };

        return cls;
    })();

    return self;
})({}, jQuery);
