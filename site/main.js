"use strict";

function RenderItemList($e, items) {
    var dataset = [];
    var col_idx_pk = 1;

    for (var i = 0; i < items.length; ++i) {
        var item = items[i];
        dataset.push([
            item.display,
            item.pk,
            null,
        ]);
    }

    $e.DataTable({
        data: dataset,
        lengthMenu: [[20, 100, 500, -1], [20, 100, 500, "All"]],
        fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            var $row = $(nRow);
            if (! $row.data("_content_filled")) {
                var pk = aData[col_idx_pk];
                var thumb_url = common.toplevel + "/api/thumb?pk=" + pk;
                var $content = $("<img>")
                    .attr({src: thumb_url})
                    .css({
                        cursor: "pointer",
                    })
                    .click(function() {
                        var url = common.toplevel + "/annotate.html?pk=" + pk;
                        var w = window.open(url, "_blank");
                        w.focus();
                    });
                $row.find(".image_cell").append($content);
                $row.data("_content_filled", true)
            }
        },
        columns: [
            { title: "Item" },
            {
                title: "ID",
                render: function(data, type, row) {
                    return data.substring(0, 8) + "...";
                },
            },
            {
                title: "Image",
                class: "center",
                render: function(data, type, row) {
                    return "<div class=\"image_cell\" />";
                },
            },
        ],
    });
}

$(function() {
    var url = common.toplevel + "/api/list";
    var $content = $("#content");
    var $loading = $("#loading");
    var $table = $("#item_table");
    $table.hide();

    $.ajax({
        url: url,
        dataType: "json",
    })
    .done(function(items) {
        RenderItemList($table, items);
        $loading.hide();
        $table.show();
    });
});
