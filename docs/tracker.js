(function() {
    // 1. Get Landing Page ID
    const lpId = document.body.getAttribute('data-lp-id');
    if (!lpId) return;

    const apiUrl = document.body.getAttribute('data-api-url') || '';
    const trackUrl = (apiUrl ? apiUrl.replace(/\/$/, '') : '') + '/api/track';

    // Helper to generate UUID v4
    function generateUUID() {
        try {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
        } catch (e) {}
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Helper: Send event payload safely with Google Sheets fallback
    function sendEvent(eventType, elementId = null) {
        const uuid = generateUUID();
        const payload = {
            landing_page_id: lpId,
            event_type: eventType,
            element_id: elementId,
            referrer: document.referrer || '',
            user_agent: navigator.userAgent,
            event_uuid: uuid
        };

        const sheetsUrl = document.body.getAttribute('data-sheets-url') || '';
        const spreadsheetId = document.body.getAttribute('data-spreadsheet-id') || '';
        const sheetName = document.body.getAttribute('data-sheet-name') || '';

        // Fallback function: send directly to Google Sheets Web App
        function sendToSheetsFallback() {
            if (!sheetsUrl || !spreadsheetId || !sheetName) return;

            const timestamp = new Date().toISOString();
            // Format rowData matching Google Sheets columns:
            // [Timestamp, Event Type, Element ID, Referrer, User Agent, IP Address, Country, Event UUID]
            const rowData = [
                timestamp,
                eventType,
                elementId || '',
                payload.referrer,
                payload.user_agent,
                'Offline_Client', // Client-side fallback cannot hash raw IP securely, mock placeholder
                'Offline_Local',
                uuid
            ];

            const sheetsPayload = {
                spreadsheet_id: spreadsheetId,
                sheet_name: sheetName,
                row_data: rowData
            };

            // Use fetch with no-cors to bypass preflight requests to Google script domain
            fetch(sheetsUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sheetsPayload)
            }).catch(() => {});
        }

        try {
            // Always try the primary backend first
            fetch(trackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).then(response => {
                if (!response.ok) {
                    // Backend responded with error (e.g. 502, 503) -> send to Google Sheets
                    sendToSheetsFallback();
                }
            }).catch(() => {
                // Backend is down/offline -> send to Google Sheets
                sendToSheetsFallback();
            });
        } catch (e) {
            sendToSheetsFallback();
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
