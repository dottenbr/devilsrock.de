// Animations and interactive effects
document.addEventListener('DOMContentLoaded', function() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reveal cards when they scroll into view
    if (!reducedMotion && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.trail-card, .community-card, .rule-item, .contact-card').forEach(el => {
            el.classList.add('reveal');
            observer.observe(el);
        });
    }

    // Ripple effect on buttons
    if (!reducedMotion) {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);

                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
                ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
                ripple.classList.add('ripple');

                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });
    }
});
