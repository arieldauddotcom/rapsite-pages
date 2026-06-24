(function() {
    // 1. Get Landing Page ID
    const lpId = document.body.getAttribute('data-lp-id');
    if (!lpId) return;

    const apiUrl = document.body.getAttribute('data-api-url') || '';
    const trackUrl = (apiUrl ? apiUrl.replace(/\/$/, '') : '') + '/api/track';

    // Helper: Send event payload safely
    function sendEvent(eventType, elementId = null) {
        const payload = {
            landing_page_id: lpId,
            event_type: eventType,
            element_id: elementId,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent
        };

        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(trackUrl, blob);
            } else {
                fetch(trackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                }).catch(() => {}); // silent catch
            }
        } catch (e) {
            // silent catch
        }
    }

    // 2. Track Pageview on Load
    sendEvent('pageview');

    // 3. Track CTA & Button Clicks
    document.addEventListener('click', function(event) {
        const target = event.target.closest('[data-track-id]');
        if (target) {
            const trackId = target.getAttribute('data-track-id');
            sendEvent('cta_click', trackId);
        }
    });

    // 4. Track Section Scrolling using IntersectionObserver
    // Trigger when 50% of the section is visible in the viewport
    const scrolledSections = new Set();
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('data-section-id');
                if (sectionId && !scrolledSections.has(sectionId)) {
                    scrolledSections.add(sectionId);
                    sendEvent('section_scroll', sectionId);
                }
            }
        });
    }, observerOptions);

    // Observe all sections with data-section-id
    document.querySelectorAll('[data-section-id]').forEach(section => {
        observer.observe(section);
    });
})();
