// Damage report form: submits to the Cloudflare Worker at /api/schaden-melden.
// Without JavaScript the form posts normally and the Worker redirects back
// to #gesendet / #fehler. With JavaScript, photos are downscaled first and
// the result is shown inline.
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('damage-form');
    if (!form) return;

    const MAX_PHOTOS = 3;
    const MAX_EDGE = 1600;
    const status = document.getElementById('form-status');
    const button = form.querySelector('button[type="submit"]');
    const buttonLabel = button.querySelector('.btn-label');
    const photoInput = document.getElementById('photos');
    const success = document.getElementById('gesendet');
    const failure = document.getElementById('fehler');

    const showStatus = (message, isError) => {
        status.hidden = false;
        status.textContent = message;
        status.classList.toggle('is-error', Boolean(isError));
    };

    photoInput.addEventListener('change', () => {
        if (photoInput.files.length > MAX_PHOTOS) {
            showStatus(`Bitte wähle höchstens ${MAX_PHOTOS} Fotos aus. Es werden nur die ersten ${MAX_PHOTOS} gesendet.`, true);
        } else {
            status.hidden = true;
        }
    });

    // Downscale to a JPEG (also drops EXIF metadata such as GPS). Falls back to the original file.
    async function shrink(file) {
        if (!file.type.startsWith('image/') || !('createImageBitmap' in window)) return file;
        try {
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            bitmap.close();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (!blob || blob.size >= file.size) return file;
            const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            return new File([blob], name, { type: 'image/jpeg' });
        } catch (error) {
            return file;
        }
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        success.classList.remove('is-shown');
        failure.classList.remove('is-shown');

        const data = new FormData(form);
        data.delete('photos');
        const photos = Array.from(photoInput.files).slice(0, MAX_PHOTOS);

        button.disabled = true;
        buttonLabel.textContent = photos.length ? 'Fotos werden vorbereitet…' : 'Wird gesendet…';
        status.hidden = true;

        try {
            for (const photo of photos) {
                data.append('photos', await shrink(photo));
            }
            buttonLabel.textContent = 'Wird gesendet…';

            const response = await fetch(form.action, {
                method: 'POST',
                body: data,
                headers: { Accept: 'application/json' }
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) {
                throw new Error(result.error || 'Unbekannter Fehler');
            }

            form.reset();
            success.classList.add('is-shown');
            if (result.skipped && result.skipped.length) {
                showStatus(`Hinweis: ${result.skipped.length} Foto(s) waren zu groß und wurden nicht mitgeschickt.`, true);
            }
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (error) {
            failure.classList.add('is-shown');
            showStatus(error.message, true);
            failure.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } finally {
            button.disabled = false;
            buttonLabel.textContent = 'Meldung senden';
        }
    });
});
