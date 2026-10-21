// Ensure login redirect always routes directly to /eos
(function() {
    try {
        if (window.location.pathname.startsWith('/login')) {
            localStorage.setItem('last_visited', '/eos');
        }
    } catch (e) {}

    document.addEventListener('DOMContentLoaded', function() {
        try {
            if (window.location.pathname.startsWith('/login')) {
                localStorage.setItem('last_visited', '/eos');
            }
        } catch (e) {}
    });
})();
