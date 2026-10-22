// Desk redirect: redirect root desk/home views to /desk/eos
(function() {
    var TARGET_ROUTE = '/desk/eos';

    function checkDeskRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('desk') === '1' || urlParams.get('no_redirect') === '1') {
            return;
        }

        const path = window.location.pathname.replace(/\/$/, '');
        const hash = window.location.hash || '';

        // Check if user landed on apps launcher (/apps, /desk) or default home workspace
        const isAppsOrDesk = (
            path === '/desk' ||
            path === '/apps' ||
            path === '/app' ||
            path === '/app/home' ||
            path === '/app/workspace/Home' ||
            path === '/app/workspaces/Home'
        );

        const isHomeHash = (!hash || hash === '#' || hash === '#workspace/Home' || hash === '#workspaces/Home');

        if (isAppsOrDesk && isHomeHash) {
            const route = (window.frappe && frappe.get_route) ? frappe.get_route() : [];
            // If route is empty or default workspace/Home, route to /desk/eos
            if (!route || !route.length || (route.length <= 2 && (route[0] === 'workspaces' || route[0] === 'workspace') && (!route[1] || route[1].toLowerCase() === 'home'))) {
                if (window.location.pathname !== TARGET_ROUTE) {
                    window.location.href = TARGET_ROUTE;
                }
            }
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(checkDeskRedirect, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(checkDeskRedirect, 100);
        });
    }

    // Also listen to router ready / change events in desk
    if (window.frappe && frappe.router) {
        frappe.router.on('change', function() {
            setTimeout(checkDeskRedirect, 50);
        });
    } else if (window.$) {
        $(document).on('app_ready', function() {
            if (window.frappe && frappe.router) {
                frappe.router.on('change', function() {
                    setTimeout(checkDeskRedirect, 50);
                });
            }
            setTimeout(checkDeskRedirect, 100);
        });
    }

    // Add an EOS Portal button to Desk navbar
    if (window.$) {
        $(document).on('toolbar_setup', function() {
            if ($('#navbar-eos-portal').length === 0) {
                $('.navbar .container .vertical-bar').after(
                    '<li class="nav-item" id="navbar-eos-portal"><a class="nav-link" href="' + TARGET_ROUTE + '" title="Open EOS" style="font-weight:600;color:var(--primary,#0070f3);display:flex;align-items:center;gap:4px">EOS</a></li>'
                );
            }
        });
    }
})();
