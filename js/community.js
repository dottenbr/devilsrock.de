const form = document.querySelector('#community-form');
const button = form.querySelector('button');
const status = document.querySelector('#community-status');
const messages = {
    '#fehler': 'Die Prüfung ist fehlgeschlagen oder abgelaufen. Bitte versuche es erneut.',
    '#limit': 'Zu viele Versuche. Bitte warte eine Minute und lade die Seite erneut.',
};
status.textContent = messages[location.hash] || 'Die Sicherheitsprüfung wird geladen …';

function disable(message) {
    button.disabled = true;
    status.textContent = message;
}

window.communityReady = async () => {
    try {
        const response = await fetch('/api/community', { cache: 'no-store' });
        if (!response.ok) throw new Error('unavailable');
        const { sitekey } = await response.json();
        window.turnstile.render('#community-captcha', {
            sitekey,
            action: 'community',
            language: 'de',
            size: window.innerWidth < 400 ? 'compact' : 'flexible',
            callback: () => {
                button.disabled = false;
                status.textContent = 'Prüfung erfolgreich. Du kannst jetzt zu WhatsApp wechseln.';
            },
            'expired-callback': () => disable('Die Prüfung ist abgelaufen. Bitte bestätige sie erneut.'),
            'error-callback': () => { disable('Die Prüfung konnte nicht geladen werden. Bitte lade die Seite erneut.'); return true; },
        });
    } catch {
        disable('Die Community ist gerade nicht erreichbar. Bitte lade die Seite später erneut.');
    }
};
form.addEventListener('submit', () => disable('WhatsApp wird geöffnet …'));
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
const script = document.createElement('script');
script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=communityReady&render=explicit';
script.async = true;
script.onerror = () => disable('Die Sicherheitsprüfung konnte nicht geladen werden. Bitte prüfe deine Verbindung und lade die Seite erneut.');
document.head.append(script);
