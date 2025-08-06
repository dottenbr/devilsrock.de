// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');

    // Navbar background on scroll
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                navbar.style.background = 'rgba(15, 15, 35, 0.8)';
                navbar.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.1)';
            } else {
                navbar.style.background = 'rgba(15, 15, 35, 0.7)';
                navbar.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.1)';
            }
        });
    }

    // Add keyboard navigation support
    document.addEventListener('keydown', function(e) {
        const navLinks = document.querySelector('.nav-links');
        const navToggle = document.querySelector('.nav-toggle');
        
        if (e.key === 'Escape' && navLinks && navToggle) {
            navLinks.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });

    // Add focus management for accessibility
    document.querySelectorAll('.btn, .social-link, .info-link').forEach(element => {
        element.addEventListener('focus', function() {
            this.style.outline = '2px solid var(--primary-color)';
            this.style.outlineOffset = '2px';
        });
        
        element.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });
}); 