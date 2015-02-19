"use strict";

common.includeScript("annoto/views.js");
common.includeScript("annoto/models.js");
common.includeScript("annoto/plugins/face_detection.js");

$(function() {
    var pk = common.getQueryParameter("pk");

    var view = new annoto.views.AnnotoTool(
        $("#content"),
        {
            'model_class': annoto.models.RepetitiveModel,
            'model_args': [annoto.models.RectangleModel],
            'plugins': [
                annoto.plugins.face_detection.FaceDetectionPlugin,
            ],
        });
    view.set_pk(pk);
});
