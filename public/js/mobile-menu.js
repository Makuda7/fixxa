/**
 * Fixxa Mobile Menu (Hamburger Menu)
 * Handles mobile navigation menu toggle
 */

(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }

  function initMobileMenu() {
    // Only run on mobile devices
    if (window.innerWidth > 768) {
      return;
    }

    // Find or create the mobile menu toggle button
    const header = document.querySelector('.header');
    const nav = document.querySelector('.nav-links');

    if (!header || !nav) {
      console.log('Mobile menu: Header or nav not found');
      return;
    }

    // Create hamburger button if it doesn't exist
    let menuToggle = document.querySelector('.mobile-menu-toggle');
    if (!menuToggle) {
      menuToggle = document.createElement('button');
      menuToggle.className = 'mobile-menu-toggle';
      menuToggle.setAttribute('aria-label', 'Toggle menu');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.innerHTML = '<span></span><span></span><span></span>';

      // Append to header (absolute positioning will place it at far right)
      header.appendChild(menuToggle);
    }

    // Create overlay if it doesn't exist
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-menu-overlay';
      document.body.appendChild(overlay);
    }

    // Toggle menu function
    function toggleMenu() {
      const isOpen = nav.classList.contains('mobile-menu-open');

      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function openMenu() {
      nav.classList.add('mobile-menu-open');
      menuToggle.classList.add('open');
      overlay.classList.add('show');
      menuToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    function closeMenu() {
      nav.classList.remove('mobile-menu-open');
      menuToggle.classList.remove('open');
      overlay.classList.remove('show');
      menuToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore scroll
    }

    // Event listeners
    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking a link or button
    const navLinks = nav.querySelectorAll('a, button');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        // Close menu immediately on selection
        // Add slight delay to ensure the click event is processed
        setTimeout(() => {
          closeMenu();
        }, 100);
      });
    });

    // Also listen for clicks on the nav itself (catch dynamically added elements)
    nav.addEventListener('click', (e) => {
      // Check if clicked element is a link or button
      const target = e.target.closest('a, button');
      if (target && nav.classList.contains('mobile-menu-open')) {
        setTimeout(() => {
          closeMenu();
        }, 100);
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('mobile-menu-open')) {
        closeMenu();
      }
    });

    // Close menu on window resize to desktop size
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768) {
          closeMenu();
          document.body.style.overflow = '';
        }
      }, 250);
    });

    console.log('Mobile menu initialized');
  }
})();
