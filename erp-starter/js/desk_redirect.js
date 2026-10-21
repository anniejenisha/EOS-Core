// Desk redirect: redirect root desk/home views to /eos portal
(function() {
    function checkDeskRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('desk') === '1' || urlParams.get('no_redirect') === '1') {
            return;
        }

        const path = window.location.pathname;
        const hash = window.location.hash || '';

        // If user landed on root /app or /app/home or default workspace
        const isRootApp = (path === '/app' || path === '/app/');
        const isHomeHash = (!hash || hash === '#' || hash === '#workspace/Home' || hash === '#workspaces/Home');

        if (isRootApp && isHomeHash) {
            const route = (window.frappe && frappe.get_route) ? frappe.get_route() : [];
            if (!route || !route.length || (route.length <= 2 && (route[0] === 'workspaces' || route[0] === 'workspace') && (!route[1] || route[1] === 'Home'))) {
                window.location.href = '/eos';
            }
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(checkDeskRedirect, 200);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(checkDeskRedirect, 200);
        });
    }

    // Add a Portal button to Desk navbar
    if (window.$) {
        $(document).on('toolbar_setup', function() {
            if ($('#navbar-eos-portal').length === 0) {
                $('.navbar .container .vertical-bar').after(
                    '<li class="nav-item" id="navbar-eos-portal"><a class="nav-link" href="/eos" title="Open Portal" style="font-weight:600;color:var(--primary,#0070f3);display:flex;align-items:center;gap:4px">Portal</a></li>'
                );
            }
        });
    }
})();
