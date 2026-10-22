// Desk redirect: redirect root desk/home views to /eos portal
(function() {
    function checkDeskRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('desk') === '1' || urlParams.get('no_redirect') === '1') {
            return;
        }

        const path = window.location.pathname.replace(/\/$/, '');
        const hash = window.location.hash || '';

        const isRootOrHomeApp = (
            path === '/app' ||
            path === '/desk' ||
            path === '/app/home' ||
            path === '/app/workspace/Home' ||
            path === '/app/workspaces/Home'
        );

        const isHomeHash = (!hash || hash === '#' || hash === '#workspace/Home' || hash === '#workspaces/Home');

        if (isRootOrHomeApp && isHomeHash) {
            const route = (window.frappe && frappe.get_route) ? frappe.get_route() : [];
            if (!route || !route.length || (route.length <= 2 && (route[0] === 'workspaces' || route[0] === 'workspace') && (!route[1] || route[1].toLowerCase() === 'home'))) {
                window.location.href = '/eos';
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

    // Add a Portal button to Desk navbar
    if (window.$) {
        $(document).on('toolbar_setup', function() {
            if ($('#navbar-eos-portal').length === 0) {
                $('.navbar .container .vertical-bar').after(
                    '<li class="nav-item" id="navbar-eos-portal"><a class="nav-link" href="/eos" title="Open Portal" style="font-weight:600;color:var(--primary,#0070f3);display:flex;align-items:center;gap:4px">EOS Portal</a></li>'
                );
            }
        });
    }
})();
