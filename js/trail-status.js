// Trail Status Logic
//
// By default the status follows the season (open 1 April - 31 October).
// /status.json can override it, e.g. to close the trails after a storm:
//   { "mode": "closed", "message": "Sturmschäden – Trails bis auf Weiteres gesperrt.", "updated": "2026-10-13" }
// "mode" is "auto", "open" or "closed"; "message" is optional.
document.addEventListener('DOMContentLoaded', async function() {
    const statusCard = document.getElementById('trail-status');
    if (!statusCard) return;

    const statusIcon = statusCard.querySelector('#status-icon use');
    const statusMessage = document.getElementById('status-message');
    const statusUpdated = document.getElementById('status-updated');

    const render = (isClosed, message, updated) => {
        statusCard.classList.toggle('closed', isClosed);
        statusCard.classList.toggle('open', !isClosed);
        // Full paths written out so scripts/build.mjs picks both icons up for the sprite
        statusIcon.setAttribute('href', isClosed ? '/assets/icons/icons.svg#ban' : '/assets/icons/icons.svg#bicycle');
        statusMessage.textContent = message;
        if (statusUpdated) {
            statusUpdated.hidden = !updated;
            statusUpdated.textContent = updated ? `Stand: ${updated}` : '';
        }
    };

    // Seasonal default: closed from November 1st to March 31st
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const seasonClosed = currentMonth >= 11 || currentMonth <= 3;
    const seasonMessage = seasonClosed
        ? 'Trail ist geschlossen (1. November - 31. März). Aktuelle Informationen über Wetterbedingungen und Wiedereröffnung auf Facebook.'
        : 'Trail ist grundsätzlich geöffnet (1. April - 31. Oktober). Temporäre Sperrungen werden auf Facebook veröffentlicht - bitte vor dem Besuch prüfen.';

    render(seasonClosed, seasonMessage, null);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(`/status.json?t=${Date.now()}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return;

        const status = await response.json();
        if (status.mode !== 'open' && status.mode !== 'closed') return;

        const isClosed = status.mode === 'closed';
        const fallback = isClosed
            ? 'Die Trails sind aktuell gesperrt. Bitte respektiere die Sperrung.'
            : 'Die Trails sind aktuell geöffnet. Viel Spaß und fahrt vorsichtig!';
        const updated = status.updated
            ? new Date(status.updated).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
            : null;
        render(isClosed, status.message || fallback, updated);
    } catch (error) {
        // Keep the seasonal status if status.json is unreachable
    }
});
