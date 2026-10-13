// Site-wide behaviour for Devils Rock Trails
// Navigation and footer markup is written into each page by scripts/build.mjs;
// this script only adds interactivity on top of it.

const Site = {
    init: function() {
        this.initMobileMenu();
        this.initNavbarScroll();
        this.updateFooterYear();
    },

    // Burger menu (below 1100px)
    initMobileMenu: function() {
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (!navToggle || !navLinks) return;

        const setOpen = (open) => {
            navLinks.classList.toggle('active', open);
            navToggle.classList.toggle('active', open);
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
        };

        navToggle.addEventListener('click', () => {
            setOpen(!navLinks.classList.contains('active'));
        });

        // Close mobile menu when clicking on a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setOpen(false));
        });

        // Close when tapping outside the navbar
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !e.target.closest('.navbar')) {
                setOpen(false);
            }
        });

        // Close with Escape and return focus to the toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                setOpen(false);
                navToggle.focus();
            }
        });
    },

    // Slightly more opaque navbar once the page is scrolled
    initNavbarScroll: function() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const update = () => navbar.classList.toggle('scrolled', window.scrollY > 100);
        window.addEventListener('scroll', update, { passive: true });
        update();
    },

    updateFooterYear: function() {
        const year = document.querySelector('.footer-year');
        if (year) {
            year.textContent = new Date().getFullYear();
        }
    }
};

Site.init();
