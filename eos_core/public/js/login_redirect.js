// Ensure login always redirects directly to /desk/eos without modifying Frappe core
(function () {
    var TARGET_ROUTE = '/desk/eos';

    function isGenericDeskRoute(val) {
        if (!val) return true;
        try {
            var decoded = decodeURIComponent(val).trim().replace(/\/$/, '');
            return (
                decoded === '' ||
                decoded === '/desk' ||
                decoded === '/apps' ||
                decoded === '/app' ||
                decoded === '/app/home' ||
                decoded === '/desk/home' ||
                decoded === '/' ||
                decoded === 'desk' ||
                decoded === 'app'
            );
        } catch (e) {
            return false;
        }
    }

    function getCleanRedirectTarget(rawVal) {
        if (isGenericDeskRoute(rawVal)) {
            return TARGET_ROUTE;
        }
        return rawVal;
    }

    // 1. If user is already logged in and navigates to /login, redirect straight to /desk/eos
    function checkAlreadyLoggedIn() {
        try {
            var status = document.body ? document.body.getAttribute('frappe-session-status') : null;
            var path = window.location.pathname;
            if (status === 'logged-in' && (path === '/login' || path.startsWith('/login/'))) {
                window.location.href = TARGET_ROUTE;
                return true;
            }
        } catch (e) {}
        return false;
    }

    // 2. Ensure redirect-to query parameter is rewritten from /desk to /desk/eos
    function ensureRedirectParam() {
        try {
            if (window.location.pathname.startsWith('/login')) {
                var url = new URL(window.location.href);
                var currentRedirect = url.searchParams.get('redirect-to');
                
                // If redirect-to is missing or points to generic /desk or /apps, redirect to /desk/eos
                if (isGenericDeskRoute(currentRedirect)) {
                    url.searchParams.set('redirect-to', TARGET_ROUTE);
                    window.location.replace(url.toString());
                    return;
                }

                if (window.localStorage) {
                    localStorage.setItem('last_visited', TARGET_ROUTE);
                }
            }
        } catch (e) {}
    }

    // 3. Patch window.login.login_handlers[200] to redirect directly to /desk/eos upon successful login
    function patchLoginHandler() {
        if (window.login && window.login.login_handlers && window.login.login_handlers[200]) {
            if (window.login.login_handlers._eos_redirect_patched) return true;

            var originalHandler = window.login.login_handlers[200];
            window.login.login_handlers[200] = function (data) {
                if (data && (data.message === 'Logged In' || data.message === 'No App')) {
                    if (window.login && window.login.set_status) {
                        window.login.set_status('Success', 'green');
                    }
                    var urlRedirect = (window.frappe && frappe.utils && frappe.utils.get_url_arg)
                        ? frappe.utils.sanitise_redirect(frappe.utils.get_url_arg('redirect-to'))
                        : null;
                    var target = getCleanRedirectTarget(urlRedirect || data.redirect_to || TARGET_ROUTE);
                    window.location.href = target;
                    return;
                }
                if (originalHandler) {
                    return originalHandler.apply(this, arguments);
                }
            };
            window.login.login_handlers._eos_redirect_patched = true;
            return true;
        }
        return false;
    }

    // 4. Intercept jQuery AJAX success for login as a fail-safe
    function setupAjaxInterceptor() {
        if (window.$ && $(document) && $(document).ajaxSuccess) {
            $(document).off('ajaxSuccess.eos_login').on('ajaxSuccess.eos_login', function (event, xhr, settings) {
                var isLoginCall = settings && (
                    settings.url === '/login' ||
                    settings.url === '/' ||
                    (settings.data && typeof settings.data === 'string' && settings.data.indexOf('cmd=login') !== -1)
                );
                if (isLoginCall) {
                    try {
                        var res = xhr.responseJSON;
                        if (res && (res.message === 'Logged In' || res.message === 'No App')) {
                            var urlRedirect = (window.frappe && frappe.utils && frappe.utils.get_url_arg)
                                ? frappe.utils.sanitise_redirect(frappe.utils.get_url_arg('redirect-to'))
                                : null;
                            var target = getCleanRedirectTarget(urlRedirect || res.redirect_to || TARGET_ROUTE);
                            window.location.href = target;
                        }
                    } catch (e) {}
                }
            });
        }
    }

    // Run immediately
    ensureRedirectParam();
    checkAlreadyLoggedIn();
    patchLoginHandler();
    setupAjaxInterceptor();

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            ensureRedirectParam();
            checkAlreadyLoggedIn();
            patchLoginHandler();
            setupAjaxInterceptor();
        });
    }

    // Hook into Frappe's login_rendered event
    if (window.$) {
        $(document).on('login_rendered', function () {
            ensureRedirectParam();
            patchLoginHandler();
            setupAjaxInterceptor();
        });
    }

    // Periodic guard to patch login_handlers as soon as login.js instantiates them
    var attempts = 0;
    var interval = setInterval(function () {
        attempts++;
        if (patchLoginHandler() || attempts > 25) {
            clearInterval(interval);
        }
    }, 100);
})();
