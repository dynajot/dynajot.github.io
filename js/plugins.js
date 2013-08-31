// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

// Place any jQuery/helper plugins in here.

(function($) {
    window.td = {};

    td.once = function(fn) {
        var called = false;
        return function() {
            if (called) {
                return;
            }
            var res = fn.apply(this, arguments);
            called = true;
            return res;
        };
    };

    td.debounce = function(fn, interval) {

        var latch = false;

        if (!interval) {
            interval = 500;
        }
        
        var set_latch = function() {
            latch = true;
            setTimeout(function() { latch = false; }, interval);
        };

        return function() {
            var e;
            var res;
            if (!latch) {
                try {
                    res = fn.apply(this, arguments);
                } catch(e) {
                    if (console && console.error) console.error(e);
                    return;
                }
                set_latch();
                return res;
            }
        };

    };

    td.get_qs = function(key) {
        var full_qs = window.location.search;
        var re = new RegExp('[\\?&]'+key+'=(.*?)(&|$)');
        var match = re.exec(full_qs);
        if (match) {
            return match[1];
        } else {
            return null;
        }
    };

    td.getCookie = function(key) {
        var re = new RegExp(key+'=(.*?)(\\;|$)');
        var match = re.exec(document.cookie.toString());
        return match ? match[1] : null;
    };

    td.logOut = function(callback) {
        $.post('/logout', callback);
    };

    td.isLoggedIn = function() {
        return !!td.getCookie('user_id');
    };
    
    $(document).ajaxSend(function(event, xhr, options) {
        var token = td.getCookie('_xsrf');
        if (token) {
            xhr.setRequestHeader('X-CSRFToken', token);
        }
    });
  
    $.fn.upload = function(url, params, progress_callback, complete_callback) {
        var accept_type = null;
        var xsrf_token = td.getCookie('_xsrf');
        if (params.accept_type) {
            accept_type = params.accept_type;
            delete params.accept_type;
        }

        var $input = $(this);
        if (accept_type) {
            $input.attr('accept', accept_type);
        }

        $input.change(function() {

            var form_data = new FormData();
            
            if ($.isFunction(params)) {
                params = params();
            }

            for (var k in params) {
                if (!params.hasOwnProperty(k)) continue;
                form_data.append(k, params[k]);
            }

            $.each($input.get(0).files, function(i) {
                form_data.append(this.name, this, this.name);
            });

            var xhr = new XMLHttpRequest();
            if (progress_callback) {
                xhr.upload.addEventListener('progress', progress_callback);
            }

            if (complete_callback) {
                xhr.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        complete_callback(this);
                    }
                };
            }

            xhr.open('POST', url, true);
            xhr.setRequestHeader('X-CSRFToken', xsrf_token);
            xhr.send(form_data);

        });
    };

    $.fn.error = function(message) {
        var $this = $(this);
        var tip;
        if (message === false) {
            tip = $this.data('errorTip');
            if (tip) {
                tip.hide();
                tip.deactivate();
                $this.removeData('errorTip');
            }
        } else if (!$this.data('errorTip')) {
            tip = $this.opentip(message, {
                'showOn':'creation',
                'style':'alert',
                'target':true,
                'hideOn':null,
                'hideDelay':99999
            });
            $this.data('errorTip', tip);
        }
        return this;
    };

    $.fn.clickOutside = function(fn) {
        var node = this.get(0);
        var unbind = null;
        var click_handler = function(evt) {
            if (!$.contains(node, evt.target)) {
                return fn.apply(node, [unbind, evt]);
            }
        };
        var $target = $(document.body); 
        unbind = function() {
            var e;
            try { 
                $target.unbind(click_handler);
            } catch (e) {}
        };
        $target.click(click_handler);
    };

    $.fn.has_valid_email = function(fn, poll_interval) {
        if (!poll_interval) {
            poll_interval = 250;
        }
        this.each(function () {
            var node = this;
            var $node = $(node);

            var initial_value = $node.val();
            var last_value = null;
            var started = false;

            var poll = td.debounce(function() {
                var val = $node.val();
                if (val != last_value && val != initial_value && /.+@.+\..+/.exec(val)) {
                    fn.apply(node, [val]);
                }
            }, poll_interval);

            $node.focus(function() {
                if (!started) {
                    $node.keyup(poll);
                    setInterval(poll, poll_interval);
                    started = true;
                }
            }).blur(function() {
                fn.apply(node, [$node.val()]);
            });
        });
    };


    $.fn.stopTyping = function(fn, timeout_interval) {
        if (!timeout_interval) {
            timeout_interval = 250;
        }
        this.each(function() {
            var node = this;
            var $node = $(node);

            var initial_value = $node.val();
            var last_value = null;
            var started = false;

            var poll = td.debounce(function() {
                var val = $node.val();
                if (val != last_value && val != initial_value) {
                    fn.apply(node, [val]);
                    last_value = val;
                }
            }, timeout_interval);

            $node.focus(function() {
                if (!started) {
                    $node.keyup(poll);
                    setInterval(poll, timeout_interval);
                    started = true;
                }
            }).blur(function() {
                fn.apply(node, [$node.val()]);
            });
        });
    };

    $.fn.tieTo = function(other, opts) {
        var $other = $(other);
        var $this = $(this);
        opts = opts || {};
        $other.click(function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            var p = $other.offset();
            $this.css({
                'position':'absolute',
                'z-index':($other.css('z-index')+1),
                'top':p.top+(opts.offset_y || 0),
                'left':p.left+(opts.offset_x || 0)
            });
            $this.show();
            $this.clickOutside(function(unbind, evt) {
                evt.preventDefault();
                $this.hide();
                if (opts.onClose) {
                    opts.onClose.apply(this, [$other, evt]);
                }
                unbind();
            });
        });
    };

    $.fn.countdownTimer = function() {
        this.each(function() {
            var $this = $(this);
            var reload = $this.attr('data-refresh') === 'true';
            var seal_time = parseInt($this.data('end-time'));
          
            var seconds_left = function() {
                return seal_time - Math.floor(Date.now() / 1000);
            };

            var pairs = [];
            $this.find('.pair').each(function() {
                var $this = $(this);
                var mod = $this.data('modulus');
                if (!mod) return;
                pairs.push([parseInt(mod),
                            $this.find('.digit .value.tens'),
                            $this.find('.digit .value.ones')]);
            });

            setInterval(function() {
                var total = seconds_left();
                if (reload && total <= 0) {
                    window.location.reload();
                    return;
                }
                for (var i=0; i < pairs.length; i++) {
                    var pair = pairs[i];
                    var mod = pair[0];

                    var value = Math.floor(total / mod);
                    var left = Math.floor(value / 10);
                    var right = value % 10;

                    pair[1].text(left);
                    pair[2].text(right);

                    total = total % mod;
                }
            }, 500);

        });
    };

    $(function() {
        Opentip.lastZIndex = 99999;

        $('.countdowntimer').countdownTimer();

        $(document.body).on('click', '.modal-trigger', function(evt) {
            evt.preventDefault();
            var $trigger = $(this);
            var content = $trigger.next('textarea.modal-trigger-content').val();

            var $template = $('#fullscreen-template');
            var $content = $template.find('.fullscreen-content');
            
            var close = function() {
                $template.hide();
                $content.empty();
            };

            $content.html(content);
            $template.find('.fullscreen-close').click(function(evt) {
                evt.preventDefault();
                close();
            });
            $template.click(function(evt) {
                if (!$.contains($content.get(0), evt.target)) {
                    close();
                    evt.preventDefault();
                }
            });
            $template.show();
        });
    
        $('.hover-tip').each(function() {
            var tip = new Opentip(this, $(this).data('tip-content'), {
                showOn: 'mouseover'
            });
            $(this).click(function(e) {
                e.preventDefault();
            });
        });

    });

}(jQuery));

 /*
 * TipTip
 * Copyright 2010 Drew Wilson
 * www.drewwilson.com
 * code.drewwilson.com/entry/tiptip-jquery-plugin
 *
 * Version 1.3   -   Updated: Mar. 23, 2010
 *
 * This Plug-In will create a custom tooltip to replace the default
 * browser tooltip. It is extremely lightweight and very smart in
 * that it detects the edges of the browser window and will make sure
 * the tooltip stays within the current window size. As a result the
 * tooltip will adjust itself to be displayed above, below, to the left 
 * or to the right depending on what is necessary to stay within the
 * browser window. It is completely customizable as well via CSS.
 *
 * This TipTip jQuery plug-in is dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */
(function($){$.fn.tipTip=function(options){var defaults={activation:"hover",keepAlive:false,maxWidth:"200px",edgeOffset:3,defaultPosition:"bottom",delay:400,fadeIn:200,fadeOut:200,attribute:"title",content:false,enter:function(){},exit:function(){}};var opts=$.extend(defaults,options);if($("#tiptip_holder").length<=0){var tiptip_holder=$('<div id="tiptip_holder" style="max-width:'+opts.maxWidth+';"></div>');var tiptip_content=$('<div id="tiptip_content"></div>');var tiptip_arrow=$('<div id="tiptip_arrow"></div>');$("body").append(tiptip_holder.html(tiptip_content).prepend(tiptip_arrow.html('<div id="tiptip_arrow_inner"></div>')))}else{var tiptip_holder=$("#tiptip_holder");var tiptip_content=$("#tiptip_content");var tiptip_arrow=$("#tiptip_arrow")}return this.each(function(){var org_elem=$(this);if(opts.content){var org_title=opts.content}else{var org_title=org_elem.attr(opts.attribute)}if(org_title!=""){if(!opts.content){org_elem.removeAttr(opts.attribute)}var timeout=false;if(opts.activation=="hover"){org_elem.hover(function(){active_tiptip()},function(){if(!opts.keepAlive){deactive_tiptip()}});if(opts.keepAlive){tiptip_holder.hover(function(){},function(){deactive_tiptip()})}}else if(opts.activation=="focus"){org_elem.focus(function(){active_tiptip()}).blur(function(){deactive_tiptip()})}else if(opts.activation=="click"){org_elem.click(function(){active_tiptip();return false}).hover(function(){},function(){if(!opts.keepAlive){deactive_tiptip()}});if(opts.keepAlive){tiptip_holder.hover(function(){},function(){deactive_tiptip()})}}function active_tiptip(){opts.enter.call(this);tiptip_content.html(org_title);tiptip_holder.hide().removeAttr("class").css("margin","0");tiptip_arrow.removeAttr("style");var top=parseInt(org_elem.offset()['top']);var left=parseInt(org_elem.offset()['left']);var org_width=parseInt(org_elem.outerWidth());var org_height=parseInt(org_elem.outerHeight());var tip_w=tiptip_holder.outerWidth();var tip_h=tiptip_holder.outerHeight();var w_compare=Math.round((org_width-tip_w)/2);var h_compare=Math.round((org_height-tip_h)/2);var marg_left=Math.round(left+w_compare);var marg_top=Math.round(top+org_height+opts.edgeOffset);var t_class="";var arrow_top="";var arrow_left=Math.round(tip_w-12)/2;if(opts.defaultPosition=="bottom"){t_class="_bottom"}else if(opts.defaultPosition=="top"){t_class="_top"}else if(opts.defaultPosition=="left"){t_class="_left"}else if(opts.defaultPosition=="right"){t_class="_right"}var right_compare=(w_compare+left)<parseInt($(window).scrollLeft());var left_compare=(tip_w+left)>parseInt($(window).width());if((right_compare&&w_compare<0)||(t_class=="_right"&&!left_compare)||(t_class=="_left"&&left<(tip_w+opts.edgeOffset+5))){t_class="_right";arrow_top=Math.round(tip_h-13)/2;arrow_left=-12;marg_left=Math.round(left+org_width+opts.edgeOffset);marg_top=Math.round(top+h_compare)}else if((left_compare&&w_compare<0)||(t_class=="_left"&&!right_compare)){t_class="_left";arrow_top=Math.round(tip_h-13)/2;arrow_left=Math.round(tip_w);marg_left=Math.round(left-(tip_w+opts.edgeOffset+5));marg_top=Math.round(top+h_compare)}var top_compare=(top+org_height+opts.edgeOffset+tip_h+8)>parseInt($(window).height()+$(window).scrollTop());var bottom_compare=((top+org_height)-(opts.edgeOffset+tip_h+8))<0;if(top_compare||(t_class=="_bottom"&&top_compare)||(t_class=="_top"&&!bottom_compare)){if(t_class=="_top"||t_class=="_bottom"){t_class="_top"}else{t_class=t_class+"_top"}arrow_top=tip_h;marg_top=Math.round(top-(tip_h+5+opts.edgeOffset))}else if(bottom_compare|(t_class=="_top"&&bottom_compare)||(t_class=="_bottom"&&!top_compare)){if(t_class=="_top"||t_class=="_bottom"){t_class="_bottom"}else{t_class=t_class+"_bottom"}arrow_top=-12;marg_top=Math.round(top+org_height+opts.edgeOffset)}if(t_class=="_right_top"||t_class=="_left_top"){marg_top=marg_top+5}else if(t_class=="_right_bottom"||t_class=="_left_bottom"){marg_top=marg_top-5}if(t_class=="_left_top"||t_class=="_left_bottom"){marg_left=marg_left+5}tiptip_arrow.css({"margin-left":arrow_left+"px","margin-top":arrow_top+"px"});tiptip_holder.css({"margin-left":marg_left+"px","margin-top":marg_top+"px"}).attr("class","tip"+t_class);if(timeout){clearTimeout(timeout)}timeout=setTimeout(function(){tiptip_holder.stop(true,true).fadeIn(opts.fadeIn)},opts.delay)}function deactive_tiptip(){opts.exit.call(this);if(timeout){clearTimeout(timeout)}tiptip_holder.fadeOut(opts.fadeOut)}}})}})(jQuery);

/*
 jquery.fullscreen 1.1.4
 https://github.com/kayahr/jquery-fullscreen-plugin
 Copyright (C) 2012 Klaus Reimer <k@ailis.de>
 Licensed under the MIT license
 (See http://www.opensource.org/licenses/mit-license)
*/
function d(b){var c,a;if(!this.length)return this;c=this[0];c.ownerDocument?a=c.ownerDocument:(a=c,c=a.documentElement);if(null==b){if(!a.cancelFullScreen&&!a.webkitCancelFullScreen&&!a.mozCancelFullScreen)return null;b=!!a.fullScreen||!!a.webkitIsFullScreen||!!a.mozFullScreen;return!b?b:a.fullScreenElement||a.webkitCurrentFullScreenElement||a.mozFullScreenElement||b}b?(b=c.requestFullScreen||c.webkitRequestFullScreen||c.mozRequestFullScreen)&&(Element.ALLOW_KEYBOARD_INPUT?b.call(c,Element.ALLOW_KEYBOARD_INPUT):
b.call(c)):(b=a.cancelFullScreen||a.webkitCancelFullScreen||a.mozCancelFullScreen)&&b.call(a);return this}jQuery.fn.fullScreen=d;jQuery.fn.toggleFullScreen=function(){return d.call(this,!d.call(this))};var e,f,g;e=document;e.webkitCancelFullScreen?(f="webkitfullscreenchange",g="webkitfullscreenerror"):e.mozCancelFullScreen?(f="mozfullscreenchange",g="mozfullscreenerror"):(f="fullscreenchange",g="fullscreenerror");jQuery(document).bind(f,function(){jQuery(document).trigger(new jQuery.Event("fullscreenchange"))});
jQuery(document).bind(g,function(){jQuery(document).trigger(new jQuery.Event("fullscreenerror"))});