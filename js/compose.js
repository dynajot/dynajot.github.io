$(document).ready(function() {
    document.execCommand("insertBrOnReturn", false, "true");

    var current;

    $("p[contenteditable]").focus(function() {
        current = this;
    });

   $('#ui-bold').click(function (){
        document.execCommand('bold', false, true);
        $(current).contents().focus();
    });
   $('#ui-italic').click(function (){
        document.execCommand('italic', false, true);
        $(current).contents().focus();
    });
   $('#ui-underline').click(function (){
        document.execCommand('underline', false, true);
        $(current).contents().focus();
    });



    $("#btn-export").click(function () {
        var $m = $("#modal-export");
        $m.find("textarea").val(extractAllHTML());
        $m.modal();
    });

    var extractAllHTML = function () {
        var allHTML = [];
        $(".content").each(function () {
            $(this).removeClass("content");
            allHTML.push(this.outerHTML);
        });
        return allHTML.join("");
    };


    //animations
    (function () {
        $("#logo > img").addClass("animate-pulse");
        setTimeout(function () {
            $("#logo > img").removeClass("animate-pulse");
        }, 750);
    })();


    var ui = {};
    ui.state = {};
    $("#paragraphs").sortable({
        axis: "y",
        containment: "#paragraphs",
        placeholder: "sortable-placeholder",
        items: "div:not(.ui)",
        handle: ".uiDragHandle",
        revert: true,
        scroll: true,
        tolerance: "pointer",
        zIndex: 9999,
        start: function(event, ui) {
            ui.item.addClass("dragging");
            $(".sortable-placeholder").css({
                height: ui.item.height()+"px"
            });
            if ($(ui.item).not(":last-child")) {
                var $maybeBr = $(ui.item).next().next();
                if ($maybeBr.is("br")) {
                    $(ui.item).next().next().remove();
                    ui.state.removed_br = true;
                }
            }
        },
        stop: function (event, ui) {
           ui.item.removeClass('dragging');
           if ($(ui.item).not(":last-child") && state.removed_br) {
                ui.state.removed_br = false;
               $("#templates .uiInlineContent").clone().insertAfter($(ui.item)).upload('/upload', {
                    accept_type: 'image/*'
                }, function(e) {
                    console.log("uploading");
                }, function(xhr) {
                    console.log("ended");
                    upload_running = false;
                });
           }
        }
    });

    $("html").on("mouseup", function () {
        if (ui.state.dragging) {
           stopDrag();
        }
    });


    var newParagraphWithContents = function (contents) {
        var $newParagraph = $("#templates .paragraph").clone();
        if (contents.length > 1 ) {
            $newParagraph.find("p").text(contents);
        } else { // enter at the end of a paragraph
            $newParagraph.find("p").html("&nbsp;");
        }
        return $newParagraph;
    };

    var newParagraphWithHTML = function (html) {
        var $newParagraph = $("#templates .paragraph").clone();
        $newParagraph.find("p").html(html);
        return $newParagraph;
    };

    var isBr = function (el) {
        return el && el.nodeType == 1 && el.tagName == "BR";
    };

    function getBlockContainer(node) {
        while (node) {
            if (node.nodeType == 1 && /^(P|H[1-6]|DIV)$/i.test(node.nodeName)) {
                return node;
            }
            node = node.parentNode;
        }
    }
    
    function extractBlockContentsFromCaret() {
        var sel = window.getSelection();
        if (sel.rangeCount) {
            var selRange = sel.getRangeAt(0);
            var blockEl = getBlockContainer(selRange.endContainer);
            if (blockEl) {
                var range = selRange.cloneRange();
                range.selectNodeContents(blockEl);
                range.setStart(selRange.endContainer, selRange.endOffset);
                return range.extractContents();
            }
        }
    }

    function enterKeyPressHandler(evt) {
        var sel, range, br, addedBr = false;
        evt = evt || window.event;
        var charCode = evt.which || evt.keyCode;
        if (charCode == 13) {
            if (typeof window.getSelection != "undefined") {
                sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    range = sel.getRangeAt(0);
                    range.deleteContents();
                    br = document.createElement("br");
                    range.insertNode(br);
                    range.setEndAfter(br);
                    range.setStartAfter(br);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    addedBr = true;
                }
            } else if (typeof document.selection != "undefined") {
                sel = document.selection;
                if (sel.createRange) {
                    range = sel.createRange();
                    range.pasteHTML("<br>");
                    range.select();
                    addedBr = true;
                }
            }

            // If successful, prevent the browser's default handling of the keypress
            if (addedBr) {
                if (typeof evt.preventDefault != "undefined") {
                    evt.preventDefault();
                } else {
                    evt.returnValue = false;
                }
            }

            // Add a new paragraph when there are two <br> tags
            var source = evt.target || evt.srcElement;
            var $source = $(source);
            $source.find("br").each(function () {
                var $this = $(this);
                var $paragraph = $this.parent();
                if (isBr(this) && $this.prev().is("br")) {
                    var content = extractBlockContentsFromCaret().textContent;
                    var $newParagraph = newParagraphWithContents(content);
                    // if pressed enter at the beginning
                    if (rangy.getSelection().getRangeAt(0).startOffset === 0 && $paragraph.html() === '<br><br>') {
                        // new empty parfagraph above
                        $paragraph.html("&nbsp;");
                    }
                    $newParagraph.insertAfter($paragraph.parent());

                    var $newSeparator = $("#templates .uiInlineContent").clone();
                    $newSeparator.insertAfter($paragraph.parent());
                    $newSeparator.find('input[type="file"]').upload('/upload', {
                        accept_type: 'image/*'
                    }, function(e) {
                        console.log("uploading");
                        // if (e.lengthComputable) {
                            // var percentage = Math.min(Math.floor((e.loaded * 100) / e.total), 99);
                            // $("#upload-progress .bar").width(percentage+1+'%');
                        // }
                    }, function(xhr) {
                        var resp = $.parseJSON(xhr.response);
                        _.each(resp['urls'], function (url) {
                            $("#words").append(createImageWithURL(url));
                        });
                        upload_running = false;
                    });

                    var range = rangy.createRange();
                    var $focus_target = $newParagraph.find('p')[0].childNodes[0];
                    range.setStart($focus_target, 0);
                    range.collapse(true);
                    var sel = rangy.getSelection();
                    sel.setSingleRange(range);

                    $this.prev().remove();
                    $this.remove();
                    $("#paragraphs").sortable("refresh");
                }
            });
        }
    }

    var createImageWithURL = function (url) {
        return [
            '<img class="content" src="',
            url,
            '"/>'
        ].join("");
    };

    var el = document.getElementById("paragraphs");

    if (typeof el.addEventListener != "undefined") {
        el.addEventListener("keypress", enterKeyPressHandler, false);
    } else if (typeof el.attachEvent != "undefined") {
        el.attachEvent("onkeypress", enterKeyPressHandler);
    }

    $(".tipped").tipTip({maxWidth: "auto", delay: 200});

    $("#btn-resize-full").click(function () {
        $(document).fullScreen(true);
        $(this).toggle();
        $("#btn-resize-small").toggle();
    });

    $("#btn-resize-small").click(function () {
        $(document).fullScreen(false);
        $(this).toggle();
        $("#btn-resize-full").toggle();
    });

    var getSelected = function () {
        if(window.getSelection) { return window.getSelection(); }
        else if(document.getSelection) { return document.getSelection(); }
        else {
            var selection = document.selection && document.selection.createRange();
            if(selection.text) { return selection.text; }
            return false;
        }
        return false;
    };

    var commenting = false;

    var showCommentBox = function () {
        commenting = true;
        $("#promptComment").show();
        setTimeout(function () {
            $("#promptComment").addClass("active");
        }, 50);
    };

    var hideCommentBox = function () {
        var $prompt = $("#promptComment");
        $prompt.removeClass("active");
        $prompt.hide();
    };

    var checkClickOutCommentBox = function (evt) {
        var $this = $(this);
        if (commenting) {
            hideCommentBox();
            // will erase ALL styles
            $commentingOn.find("span.active-highlight").each(function () {
                var $this = $(this);
                if ($this.attr('class').split(" ").length === 1) {
                    $this.replaceWith($this.text());
                } else {
                    $this.removeClass("active-highlight");
                }
            });
        }
        commenting = false;
    };

    $("#promptComment").click(function (evt) {
        evt.stopPropagation();
    });

    $("#words").on("mouseup", ".paragraph", function () {
        // checkClickOutCommentBox();
        // var selection = getSelected();
        // var $this = $(this);
        // if(selection && selection.extentOffset != selection.baseOffset) {
        //     showCommentBox();
        //     $commentingOn = $this;
        //     $this.html($this.html().replace(selection, '<span class="active-highlight">'+selection+'</span>'));
        //     $(".offseter").css({
        //         "height": $(".active-highlight").offset().top+"px"
        //     });
        // }
    });

    $("#words").on("click", ".btn-delete", function () {
        $(this).parent('.image').remove();
    });

    $("#words").on("keyup", function () {
        var $this = $(this);
        $this.find('.uiDragHandle').addClass('editing');
        _.debounce(setTimeout(function () {
            $this.find('.uiDragHandle').removeClass('editing');
        }, 1750), 1000);
    });

    $("html").click(function () {
        checkClickOutCommentBox();
    });
});