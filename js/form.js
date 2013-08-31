(function($){

var ns = {};

$.fn.form = function(method) {
    return ns[method].apply(this,
        Array.prototype.slice.call(arguments, 1));
};

ns.validates = function(selector, thunk) {
    var $this = this;
    var $target = $this.find(selector);
    if ($target.length < 1) {
        return false;
    }
    var data = $this.data('form-validators') || [];
    data.push([selector, thunk]);
    $this.data('form-validators', data);
    return this;
};

var return_true = function() {
    return true;
};

ns.validateAll = function(filter) {
    var $this = this;
    var all_okay = true;
    if (!filter) {
        filter = return_true;
    }
    var seen_nodes = [];
    $.each(($this.data('form-validators') || []), function(idx, val) {
        var selector = val[0];
        var thunk = val[1];
        $this.find(selector).each(function(){
            var $target = $(this);
            if (!($target.is(filter) && $target.is(':visible'))) {
                return;
            }
            var verdict = thunk.apply($this, [$target.val(), $target]);
            if (verdict !== false) {
                $target.error(verdict);
                $target.data('form-fail', true);
                all_okay = false;
            }
            seen_nodes.push($target);
        });
    });
    $.each(seen_nodes, function() {
        if (this.data('form-fail') !== true) {
            this.error(false); // disable error
        }
    });
    $.each(seen_nodes, function() {
        this.removeData('form-fail');
    });
    return all_okay;
};

ns.validate = function() {

    this.each(function() {
        var $this = $(this);
        var $form = $this.parent('form');
        $form.form('validateAll', $this);
    });

    return this;
};

var validators = {};
validators.email = function(inp) {
    if (!/.+@.+\..+/.exec(inp)) {
        return 'Are you sure this is a valid email address?';
    }
    return false;
};
validators.password_check = function(target_selector) {
    return function(value) {
        var $password_target = this.find(target_selector);
        if (value != $password_target.val()) {
            return 'Passwords do not match.';
        }
        return false;
    };
};
validators.required = function(value) {
    if (!value) {
        return 'I think you forgot something.';
    }
    return false;
};

ns.initValidators = function() {
    var $form = this;
    $form.form('validates', 'input[type="email"]', validators.email);
    $form.form('validates', 'input.password-check',
        validators.password_check('input[type="password"]:not(.password-check)'));
    $form.form('validates', 'input.required', validators.required);

    $form.find('input').stopTyping(function() {
        $form.form('validateAll', this);
    });

    return this;
};

var check_form_response = function($form, xhr, url, onSuccess, onFailure) {
    return function(response) {
        var data = $.parseJSON(response.responseText);
        if (data.error) {
            if (data.error_code == 401) {
                td.logIn(function() {
                    xhr(url);
                });
                return;
            }
            if (onFailure && onFailure.apply($form, data) === false) {
                return;
            }
            if (data.errors) {
                for (var k in data.errors) {
                    if (!data.errors.hasOwnProperty(k)) continue;
                    $form.find('[name="'+k+'"]').error(data.errors[k]);
                }
            } else {
                $form.find('input[type="submit"]').error(
                    data.message ||
                        'There was a problem submitting this form. Please double-check what you typed and try again.');
            }
        } else {
            $form.find('input[type="submit"]').error(false);
            if (onSuccess) {
                onSuccess.apply($form, [data]);
            }
        }
    };
};

$.fn.dynForm = function(url, onSuccess, onFailure) {
    this.each(function() {
        var $form = $(this);
        $form.form('initValidators');
        $form.submit(function(evt) {
            var $this = $(this);
            evt.preventDefault();
            if (!$this.form('validateAll')) {
                return false;
            }
            var xhr;
            xhr = function(url) {
                if (typeof(url) === 'function') {
                    url(xhr);
                } else {
                    $.ajax({
                        'type':'POST',
                        'url':url,
                        'data':$form.serialize(),
                        'complete':check_form_response($form, xhr, url, onSuccess, onFailure)
                    });
                }
            };
            xhr(url);
        });
    });
    return this;
};

}(jQuery));
