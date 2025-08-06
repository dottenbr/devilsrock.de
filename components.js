// Components for Devils Rock Trails website
// This file contains reusable HTML components to reduce code duplication

const Components = {
    // Load component from HTML file
    loadComponent: async function(componentName) {
        try {
            // Determine the correct path based on current page location
            const isInPages = window.location.pathname.includes('/pages/');
            const basePath = isInPages ? '../' : './';
            const response = await fetch(`${basePath}components/${componentName}.html`);
            if (response.ok) {
                let html = await response.text();
                
                // Update paths in the HTML based on current location
                if (isInPages) {
                                    // Update asset paths for pages subdirectory
                html = html.replace(/src="assets\/images\//g, 'src="../assets/images/');
                html = html.replace(/src="assets\/logo\.png/g, 'src="../assets/images/logo.png');
                html = html.replace(/href="index\.html/g, 'href="../index.html');
                html = html.replace(/href="pages\//g, 'href="../pages/');
                }
                
                return html;
            } else {
                console.error(`Failed to load component: ${componentName}`);
                return '';
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
            return '';
        }
    },

    // Initialize components on page load
    init: async function() {
        // Load and replace navigation placeholder
        const navPlaceholder = document.getElementById('nav-placeholder');
        if (navPlaceholder) {
            const navHtml = await this.loadComponent('nav');
            if (navHtml) {
                navPlaceholder.innerHTML = navHtml;
            }
        }

        // Load and replace footer placeholder
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
            const footerHtml = await this.loadComponent('footer');
            if (footerHtml) {
                footerPlaceholder.innerHTML = footerHtml;
            }
        }

        // Replace page header placeholder
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
            const title = headerPlaceholder.getAttribute('data-title');
            const subtitle = headerPlaceholder.getAttribute('data-subtitle');
            if (title) {
                headerPlaceholder.innerHTML = this.pageHeader(title, subtitle || '');
            }
        }

        // Initialize mobile menu functionality and smooth scrolling after components are loaded
        setTimeout(() => {
            this.initMobileMenu();
            this.initSmoothScrolling();
        }, 200);
    },

    // Page header component (for nutzungsbestimmungen.html)
    pageHeader: (title, subtitle) => `
        <section class="page-header">
            <div class="container">
                <h1>${title}</h1>
                <p class="header-subtitle">${subtitle}</p>
            </div>
        </section>
    `,

    // Initialize mobile menu functionality
    initMobileMenu: function() {
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        
        if (navToggle && navLinks) {
            // Remove any existing event listeners to avoid duplicates
            navToggle.removeEventListener('click', this.mobileMenuHandler);
            
            // Add new event listener
            this.mobileMenuHandler = function() {
                navLinks.classList.toggle('active');
                navToggle.classList.toggle('active');
            };
            
            navToggle.addEventListener('click', this.mobileMenuHandler);
            
            // Close mobile menu when clicking on a link
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    navToggle.classList.remove('active');
                });
            });
        }
    },

    // Initialize smooth scrolling for anchor links
    initSmoothScrolling: function() {
        // Handle anchor links (starting with #)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Handle internal links with hash (like index.html#team)
        document.querySelectorAll('a[href*="#"]').forEach(anchor => {
            const href = anchor.getAttribute('href');
            if (href.includes('#')) {
                anchor.addEventListener('click', function (e) {
                    const hash = href.split('#')[1];
                    const target = document.querySelector('#' + hash);
                    if (target) {
                        e.preventDefault();
                        const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                        window.scrollTo({
                            top: offsetTop,
                            behavior: 'smooth'
                        });
                    }
                });
            }
        });
    }
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    Components.init();
}); 