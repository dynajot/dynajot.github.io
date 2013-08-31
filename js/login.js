(function($) {

    var chain = function(a, b) {
        return function() {
            a.apply(this, arguments);
            b.apply(this, arguments);
        };
    };

    var once = td.once;
    
    var email_has_password = function(email, callback) {
        $.getJSON('/email_has_password/'+escape(email), callback);
    };

    $.fn.loginForm = function(method, callback) {
        
        this.each(function() {
        
        var $form = $(this);

        if (method === 'on_login') {
            var callbacks = $form.data('login-callbacks') || [];
            callbacks.push(callback);
            $form.data('login-callbacks', callbacks);
            return;
        }

        var has_password = null;
        var started_getting_password = false;
        var on_has_password = function() {};

        var prev_email = null;
        var update_password = function() {
            if (started_getting_password) {
                return;
            }
            var val = $form.find('input[name="email"]').val();
            if (!val || val == prev_email) {
                return;
            }
            started_getting_password = true;
            prev_email = val;
            email_has_password(val, function(response) {
                started_getting_password = false;
                has_password = response;
                on_has_password(response);
            });
        };

        var when_has_password = function(fn) {
            if (has_password !== null && !started_getting_password) {
                fn(has_password);
            } else {
                on_has_password = chain(on_has_password, fn);
                if (!started_getting_password) {
                    update_password();
                }
            }
        };

        $form.find('input[name="email"]').has_valid_email(update_password);

        var show_login_form = function() {
            var $form_container = $form.parent();
            $form.find('.status .msg').hide();
            $form.find('.status .login').show();
            $form.find('.password-confirmation').hide();
            $form_container.find('.sign-up-title').hide();
            $form_container.find('.log-in-title').show();
            $form_container.find('.set-password-title').hide();
            $form.find('input[type="submit"]').val('Log In');
        };

        var show_signup_form = function() {
            var $form_container = $form.parent();
            $form.find('.status .msg').hide();
            $form.find('.status .signup').show();
            $form.find('.password-confirmation').show();
            $form_container.find('.log-in-title').hide();
            $form_container.find('.sign-up-title').show();
            $form_container.find('.set-password-title').hide();
            $form.find('input[type="submit"]').val('Sign Up');
        };

        when_has_password(function(has_password) {
            var $form_container = $form.parent();
            $form.find('.password-input').show();
            $form_container.find('.or-title').hide();
            if (has_password.has_password) {
                $form.find('.status .msg').hide();
                $form.find('.status .login').show();
                $form.find('.password-confirmation').hide();
                $form_container.find('.sign-up-title').hide();
                $form_container.find('.log-in-title').show();
                $form_container.find('.set-password-title').hide();
                $form.find('input[type="submit"]').val('Log In');
            } else {
                if (has_password["email_exists"]) {
                    $form.find('.status .msg').hide();
                    $form.find('.status .setpassword').show();
                    $form_container.find('.log-in-title').hide();
                    $form_container.find('.sign-up-title').hide();
                    $form_container.find('.set-password-title').show();
                    $form.find('input[type="submit"]').val('Set My Password');
                }  else {
                    $form.find('.status .msg').hide();
                    $form.find('.status .signup').show();
                    $form.find('.password-confirmation').show();
                    $form_container.find('.log-in-title').hide();
                    $form_container.find('.sign-up-title').show();
                    $form_container.find('.set-password-title').hide();
                    $form.find('input[type="submit"]').val('Sign Up');
                }
            }
            $form.find('.submit-button').show();
        });

        var get_post_url = function(callback) {
            when_has_password(once(function(has_password) {
                if (has_password.email_exists) {
                    callback('/login.json');
                } else {
                    callback('/signup.json');
                }
            }));
        };

        var send_confirmation_email = function() {
            var email = $form.find('input[type="email"]').val();
            var password = $form.find('input[type="password"]:not(.password-confirmation)').val();
            $.post('/send_confirmation_email.json', {
                'email':email, 'password':password},
                function() {
                    $form.find('.password-reset-confirmation').hide();
                    $form.find('.email-confirmation').show();
                }
            );
        };

        $form.on('click', '.password-reset-confirmation .no-button', function(evt) {
            $form.find('.password-reset-confirmation').hide();
            evt.preventDefault();
        }).on('click', '.password-reset-confirmation .yes-button', function(evt) {
            send_confirmation_email();
            evt.preventDefault();
        });

        $form.on('click', '.log-in-link', function(evt) {
            evt.preventDefault();
            show_login_form();
        });
        $form.on('click', '.sign-up-link', function(evt) {
            evt.preventDefault();
            show_signup_form();
        });

        $form.dynForm(get_post_url, function(response) {
            // success
            when_has_password(once(function(has_password) {
                if (has_password.has_password) {
                    var callbacks = $form.data('login-callbacks');
                    if (callbacks) {
                        $.each(callbacks, function() {
                            var e;
                            try {
                                this();
                            } catch(e) {
                                if (console && console.error) console.error(e);
                            }
                        });
                    }
                    $form.removeData('login-callbacks');
                } else {
                    $form.parent().find('.email-confirmation').show();
                }
            }));
        }, function(response) {
            // failure
            if (has_password && has_password.email_exists) {
                if (has_password.has_password) {
                    $form.find('.password-reset-confirmation').show();
                } else {
                    send_confirmation_email();
                }
                return false;
            }
        });

    });
    };

    var login_modal_open = false;
    td.requireLogin = function(callback) {
        if (td.isLoggedIn()) {
            if (callback) callback();
            return;
        }
        if (callback) {
            $('#login-modal .login-form').loginForm('on_login', callback);
        }
        if (!login_modal_open) {
            $('#login-modal .login-form').loginForm('on_login', function() {
                $('login-modal').modal('hide');
                login_modal_open = false;
            });
            $('#login-modal').modal('show');
            login_modal_open = true;
        }
    };

    td.logIn = td.requireLogin;
    
    $(function() {
        $('.login-form').loginForm();
        $(document.body).on('click', 'a[href="#"].login-link', function(evt) {
            td.logIn(function() {
                window.location.reload();       
            });
            evt.preventDefault();
        });
    });

}(jQuery));
