"use strict";

common.includeScript("annoto/annoto.js");
common.includeScript("annoto/models.js");

window.annoto.plugins.face_detection = window.annoto.plugins.face_detection || (function(self, $) {
    self.FaceDetectionPlugin = (function() {
        var cls = function(data) {
            var T = this;
            annoto.plugins.Plugin.call(T);
        };

        cls.prototype = new annoto.plugins.Plugin();

        cls.prototype.on_setup = function() {
            var T = this;
            var view = T.view;
            var $menu = view.$menu;
            $menu
                .append($("<li>")
                        .append("Detect faces")
                        .click(function() {
                            var pk = T.view.pk;
                            var ajax_succeeded = false;
                            view.message("Detecting faces...");
                            var xhr = $.ajax(
                                common.toplevel + "/api/plugin/facedetect?" + common.encodeQueryParameters({ "pk": pk }),
                                {
                                    "dataType": "json",
                                })
                                .done(function(result) {
                                    ajax_succeeded = true;
                                    if (result.pk == pk) {
                                        var faces = result.faces;
                                        view.message("Face detection was successful.");
                                        view.message(faces.length + " faces found.");
                                        for (var i = 0; i < faces.length; ++i) {
                                            var rect = faces[i];
                                            var m = new annoto.models.RectangleModel();
                                            m.set_model_data(rect);
                                            view.model.finished_models.push(m);
                                            view.draw();
                                        }
                                    }
                                })
                                .always(function() {
                                    $dialog.dialog("close");
                                });

                            var $dialog = $("<div>")
                                .append("Detecting faces...")
                                .dialog({
                                    buttons: {
                                        "Cancel": function() {
                                            $dialog.dialog("close");
                                        },
                                    },
                                    close: function() {
                                        if (!ajax_succeeded) {
                                            xhr.abort();
                                            view.message("Face detection has been canceled.");
                                        }
                                    },
                                    modal: true,
                                });
                        })
                       )
                .menu("refresh");
        };

        return cls;
    })();

    return self;
})({}, jQuery);
