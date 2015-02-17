"use strict";

common.includeScript("annoto/annoto.js");

window.annoto.views = window.annoto.views || (function(self, $) {
    self.Viewport = (function() {
        var cls = function(data) {
            var T = this;
            T.cw = 0;
            T.ch = 0;
            T.dx = 0;
            T.dy = 0;
            T.scale = 1;

            if (data) {
                for (var k in data) {
                    common.assert_defined(T[k]);
                    T[k] = data[k];
                }
            }
        };

        cls.prototype.inv_transform = function(x, y) {
            var T = this;
            var xd = (x - T.dx) / T.scale;
            var yd = (y - T.dy) / T.scale;
            return [xd, yd];
        };

        cls.prototype.transform = function(x, y) {
            var T = this;
            var xd = x * T.scale + T.dx;
            var yd = y * T.scale + T.dy;
            return [xd, yd];
        };

        cls.prototype.translate = function(dx, dy) {
            var T = this;
            T.dx += dx;
            T.dy += dy;
        };

        cls.prototype.scaleMult = function(factor, posCenter) {
            var T = this;
            var mx = posCenter[0], my = posCenter[1];

            T.dx = (T.dx - mx) * factor + mx;
            T.dy = (T.dy - my) * factor + my;
            T.scale *= factor
        };

        cls.prototype.transformCanvasContext = function(ctx) {
            var T = this;
            ctx.translate(T.dx, T.dy);
            ctx.scale(T.scale, T.scale);
        };

        cls.prototype.invTransformCanvasContext = function(ctx) {
            var T = this;
            ctx.scale(1./T.scale, 1./T.scale);
            ctx.translate(-T.dx, -T.dy);
        };

        return cls;
    })();

    self.ThumbnailView = (function() {
        var cls = function(data) {
            var T = this;

            data = data || {};
            var width = data.width || 240;
            var height = data.height || 180;

            var $canvas = $("<canvas>")
                .attr({ "width": width, "height": height })
                .css({
                    "width": width + "px",
                    "height": height + "px",
                    "background": "#666666",
                })
            ;

            T.$back_canvas = null;
            T.$canvas = $canvas;
            T.width = width;
            T.height = height;
            T.image = null;
            T.viewport = null;

            T.draw();
        };

        cls.prototype.get_element = function() {
            var T = this;
            return T.$canvas;
        };

        cls.prototype.set_image = function(image) {
            var T = this;
            var cw = T.$canvas.width();
            var ch = T.$canvas.height();
            var iw = image.width;
            var ih = image.height;
            var bcw, bch;
            var scale;
            if (ch * iw > cw * ih) {
                scale = 1. * cw / iw;
            } else {
                scale = 1. * ch / ih;
            }
            var bcw = scale * iw, bch = scale * ih;

            var $back_canvas = T.$back_canvas;

            if (!$back_canvas) {
                $back_canvas = $("<canvas>");
            }
            $back_canvas
                .attr({ "width": bcw, "height": bch });

            var ctx = $back_canvas[0].getContext("2d");
            ctx.drawImage(image, 0, 0, iw, ih, 0, 0, bcw, bch);

            T.image = image;
            T.$back_canvas = $back_canvas;
            T.scale = scale;
            T.draw();
        };

        cls.prototype.set_viewport = function(viewport) {
            var T = this;
            T.viewport = viewport;
            T.draw();
        };

        cls.prototype.draw = function() {
            var T = this;
            var ctx = T.$canvas[0].getContext("2d");
            var cw = T.$canvas.width();
            var ch = T.$canvas.height();
            ctx.clearRect(0, 0, cw, ch);
            if (T.$back_canvas) {
                var back_canvas = T.$back_canvas[0];
                var dx = (cw - back_canvas.width) / 2;
                var dy = (ch - back_canvas.height) / 2;
                ctx.drawImage(back_canvas, dx, dy);

                if (T.viewport && T.image) {
                    var iw = T.image.width;
                    var ih = T.image.height;
                    var viewport = T.viewport;
                    var scale_x = T.scale;
                    var scale_y = T.scale;
                    ctx.save();

                    var p1 = viewport.inv_transform(0, 0);
                    var p2 = viewport.inv_transform(viewport.cw, viewport.ch);
                    var x1 = p1[0] * scale_x + dx;
                    var y1 = p1[1] * scale_y + dy;
                    var x2 = p2[0] * scale_x + dx;
                    var y2 = p2[1] * scale_y + dy;

                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(cw, 0);
                    ctx.lineTo(cw, ch);
                    ctx.lineTo(0, ch);
                    ctx.lineTo(0, 0);
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x1, y2);
                    ctx.lineTo(x2, y2);
                    ctx.lineTo(x2, y1);
                    ctx.lineTo(x1, y1);
                    ctx.closePath();
                    ctx.clip();
                    ctx.fillStyle = "rgba(40, 40, 40, 0.7)";
                    ctx.fillRect(0, 0, cw, ch);

                    ctx.lineWidth = 3.;
                    ctx.strokeStyle = "#ffffff";
                    ctx.strokeRect(x1, y1, x2-x1, y2-y1);
                    ctx.restore();
                }
            }
        };

        return cls;
    })();

    self.AnnotoTool = (function() {
        var cls = function($e, data) {
            var T = this;

            common.assert_defined(data);
            common.assert_defined(data.model_class);

            //----------------
            // Canvas
            //----------------
            var $canvas = $("<canvas>")
                .resize(function() {
                    T.update_canvas_size();
                })
                .mousedown(function(ev) {
                    if (ev.which == 1) {
                        var pos = common.getMouseEventPos(ev, $canvas);
                        $canvas.__leftButtonStates = {
                            startPos: pos,
                            currentPos: pos,
                            prevPos: null,
                            ctrlKey: ev.ctrlKey,
                            dragged: false,
                            prevDragged: false,
                            startViewport: T.viewport,
                            update: function(pos) {
                                this.prevPos = this.currentPos;
                                this.currentPos = pos;
                                var dx = pos[0] - this.startPos[0];
                                var dy = pos[1] - this.startPos[1];
                                this.prevDragged = this.dragged;
                                if (!this.dragged) {
                                    if (Math.sqrt(dx*dx + dy*dy) > 10) {
                                        this.dragged = true;
                                    }
                                }
                            },
                        };
                        ev.preventDefault();
                    }
                })
                .mousewheel(function(ev) {
                    ev.preventDefault();
                    if (!T.viewport) {
                        return;
                    }

                    var cw = T.$canvas.width();
                    var ch = T.$canvas.height();
                    var deltaY = ev.deltaY;
                    var deltaX = ev.deltaX;
                    if (ev.ctrlKey) {
                        var s = 1.2;
                        var scaleFactor = deltaY > 0 ? s : 1/s;
                        var mousePos = common.getMouseEventPos(ev, $canvas);
                        T.viewport.scaleMult(scaleFactor, mousePos);
                        T.on_viewport_update();
                    } else if (ev.shiftKey) {
                        var dx = (deltaX > 0 ? 1 : -1) * Math.min(cw,ch) * 0.05;
                        T.viewport.translate(dx, 0);
                        T.on_viewport_update();
                    } else {
                        var dy = (deltaY > 0 ? 1 : -1) * Math.min(cw,ch) * 0.05;
                        T.viewport.translate(0, dy);
                        T.on_viewport_update();
                    }
                })
            ;

            //----------------
            // document
            //----------------
            $(document)
                .mousemove(function(ev) {
                    if (T.viewport) {
                        var pos = common.getMouseEventPos(ev, $canvas);
                        T.__mousePos = pos;

                        var move = function() {
                            var pos_i = T.viewport.inv_transform(pos[0], pos[1]);
                            var data = {
                                need_redraw: false,
                                x: pos_i[0], y: pos_i[1],
                            };
                            if (T.model.process_input("move", data)) {
                                T.__completed = true;
                            }
                            if (data.need_redraw) {
                                T.drawCanvas();
                            }
                        }

                        var bstates = $canvas.__leftButtonStates;
                        if (bstates) {
                            bstates.update(common.getMouseEventPos(ev, $canvas));

                            if (!T.__completed) {
                                ev.preventDefault();
                                if (bstates.ctrlKey) {
                                    if (!bstates.viewport) {
                                        bstates.iew = $.extend({}, T.viewport);
                                    }

                                    var dx = bstates.currentPos[0] - bstates.prevPos[0];
                                    var dy = bstates.currentPos[1] - bstates.prevPos[1];

                                    T.viewport.translate(dx, dy);
                                    T.on_viewport_update();
                                } else {
                                    if (!bstates.prevDragged && bstates.dragged) {
                                        if (! T.__completed) {
                                            T.inputPoint(bstates);
                                        }
                                    }
                                    move();
                                }
                            }
                        } else {
                            move();
                        }

                    }
                })
                .mouseup(function(ev) {
                    if (ev.which == 1 && $canvas.__leftButtonStates) {
                        // Mouse pointer has moved
                        var bstates = $canvas.__leftButtonStates;
                        bstates.update(common.getMouseEventPos(ev, $canvas));
                        var pos0 = bstates.startPos;
                        var pos1 = bstates.currentPos;

                        if (!bstates.ctrlKey) {
                            if (! T.__completed) {
                                T.inputPoint(bstates);
                            }
                        }

                        $canvas.__leftButtonStates = null;
                        ev.preventDefault();
                    }
                })
            ;

            //----------------
            // Menu
            //----------------
            var $menu = $("<ul>")
                .append($("<li>")
                        .append("Save")
                        .click(function() {
                            var pk = T.pk;
                            if (pk) {
                                var model_data = T.model.get_model_data();
                                var qdata = {
                                    "json": JSON.stringify([[pk, {
                                        "model_data": model_data,
                                    }]])
                                };
                                //var update_url = common.toplevel + "/api/update_item?" + common.encodeQueryParameters(qdata);
                                var update_url = common.toplevel + "/api/update_item";
                                $.ajax(
                                    update_url,
                                    {
                                        "type": "POST",
                                        "data": qdata,
                                    }
                                ).done(function() {
                                    console.log("Successfully updated item: " + pk);
                                });
                            }
                        })
                       )
                .append($("<li>")
                        .append("Clear")
                        .click(function() {
                            if (confirm("Clearing annotations of this image.\nAre you sure?")) {
                                T.set_new_model();
                                T.drawCanvas();
                            }
                        })
                       )
                .menu()
            ;

            //----------------
            // Right sidebar
            //----------------
            var LEFT_SIDEBAR_WIDTH = 150;
            var RIGHT_SIDEBAR_WIDTH = 245;
            var thumb_view = new self.ThumbnailView({
                width: RIGHT_SIDEBAR_WIDTH - 5, height: 180,
            });

            //----------------
            // Layout
            //----------------
            var $left_sidebar = $("<div>")
                .css({
                    "float": "left",
                    "width": LEFT_SIDEBAR_WIDTH + "px",
                    "background": "#dddddd",
                    "height": "100vh",
                })
                .append($menu);
            var $right_sidebar = $("<div>")
                .css({
                    "float": "right",
                    "width": RIGHT_SIDEBAR_WIDTH + "px",
                    "background": "#444444",
                    "height": "100vh",
                })
                .append(thumb_view.get_element())
            ;
            var $middle_column = $("<div>")
                .css({
                    "margin-left": (LEFT_SIDEBAR_WIDTH+5) + "px",
                    "margin-right": (RIGHT_SIDEBAR_WIDTH+5) + "px",
                })
                .append($canvas);

            //----------------

            var $img = $("<img>");

            $img
                .load(function() { T.drawCanvas(); });

            $e
                .append($left_sidebar)
                .append($right_sidebar)
                .append($middle_column)
            ;

            T.$e = $e;
            T.$canvas = $canvas;
            T.$img = $img;
            T.pk = null;
            T.viewport = null;
            T.model = null;
            T.model_class = data.model_class;
            T.model_args = data.model_args || [];
            T.thumb_view = thumb_view;

            T.update_canvas_size();
        };

        cls.prototype.set_new_model = function() {
            var T = this;
            var factory = T.model_class.bind.apply(T.model_class, [null].concat(T.model_args));
            T.model = new factory();
            T.set_model(T.model);
        };

        cls.prototype.update_canvas_size = function() {
            var T = this;
            T.$canvas.attr({
                width: T.$canvas.width(),
                height: T.$canvas.height(),
            });
            T.updateViewport();
        };

        cls.prototype.set_model = function(model) {
            var T = this;
            T.model = model;
        };

        cls.prototype.set_pk = function(pk) {
            var T = this;
            T.pk = pk;
            T.set_new_model();

            // item
            $.ajax(
                common.toplevel + "/api/get_item?" + common.encodeQueryParameters({ 'pk': pk }),
                {
                    'dataType': 'json',
                })
                .done(function(item) {
                    if (T.pk == pk) {
                        console.log(item);
                        if (item.model_data) {
                            T.model.set_model_data(item.model_data);
                        }
                    }
                })
                .fail(function() {
                    console.log("get_item failed: pk=", pk);
                })
            ;

            // Image
            var image_url = common.toplevel + "/api/image?" + common.encodeQueryParameters({ 'pk': pk });
            T.$img
                .attr("src", image_url)
                .one("load", function() {
                    T.updateViewport();
                    T.thumb_view.set_image(T.$img[0]);
                    T.thumb_view.set_viewport(T.viewport);
                });
        };

        cls.prototype.inputPoint = function(bstates) {
            var T = this;
            var pos = bstates.currentPos;
            var pos_i = T.viewport.inv_transform(pos[0], pos[1]);
            var data = {
                need_redraw: false,
                x: pos_i[0], y: pos_i[1],
            };
            if (T.model.process_input("point", data)) {
                T.__completed = true;
            }
            if (data.need_redraw) {
                T.drawCanvas();
            }
        };

        cls.prototype.updateViewport = function() {
            var T = this;
            var img = T.$img[0];

            if (!img.complete) {
                T.viewport = null;
                return;
            }

            var iw = img.width;
            var ih = img.height;
            if (!iw || !ih) {
                T.viewport = null;
                return;
            }

            var cw = T.$canvas.width();
            var ch = T.$canvas.height();
            var scale;
            var dx=0, dy=0;
            if (cw * ih < ch * iw) {
                scale = cw / iw;
                dx = cw / 2;
                dy = cw * ih / iw / 2;
            } else {
                scale = ch / ih;
                dx = ch * iw / ih / 2;
                dy = ch / 2;
            }
            T.viewport = new self.Viewport({
                scale: scale,
                dx: cw / 2 - dx,
                dy: ch / 2 - dy,
                cw: cw,
                ch: ch,
            });

            T.on_viewport_update();
        };

        cls.prototype.on_viewport_update = function() {
            var T = this;
            T.thumb_view.set_viewport(T.viewport);
            T.drawCanvas();
        };

        cls.prototype.drawCanvas = function() {
            var T = this;
            var $canvas = T.$canvas;
            var ctx = $canvas[0].getContext("2d");
            var img = T.$img[0];

            if (!img.complete) {
                return;
            }
            if (!T.viewport) {
                return;
            }
            var cw = $canvas.width();
            var ch = $canvas.height();

            ctx.clearRect(0, 0, cw, ch);
            ctx.save();
            T.viewport.transformCanvasContext(ctx);
            ctx.drawImage(img, 0, 0);
            var data = {
                scale: T.viewport.scale,
            };
            if (T.__mousePos) {
                data['mousePos'] = T.viewport.inv_transform(T.__mousePos[0], T.__mousePos[1]);
            }
            if (T.model) {
                T.model.draw(ctx, data);
            }
            ctx.restore();
        };


        return cls;
    })();

    return self;
})({}, jQuery);
