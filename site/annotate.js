"use strict";

common.includeScript("annoto/views.js");
common.includeScript("annoto/models.js");

$(function() {
    var pk = common.getQueryParameter("pk");

    var view = new annoto.views.AnnotoTool(
        $("#content"),
        {
            'model_class': annoto.models.RepetitiveModel,
            'model_args': [annoto.models.RectangleModel],
        });
    view.set_pk(pk);
});
