"use strict";

common.includeScript("annoto/views.js");
common.includeScript("annoto/models.js");

var Model = (function() {
    function cls() {
        var T = this;
        annoto.models.NestedModel.call(T);

        T.current_model = new annoto.models.SegmentModel();
    }

    cls.prototype = new annoto.models.NestedModel();

    cls.prototype.on_inner_model_finish = function(prev_model) {
        if (prev_model instanceof annoto.models.SegmentModel) {
            var a =  new annoto.models.RectangleModel();
            return a;
        } else if (prev_model instanceof annoto.models.RectangleModel) {
            return new annoto.models.SegmentModel();
            return null;
        } else {
            common.assert(false);
        }
    };

    return cls;
})();


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
