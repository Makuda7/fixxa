/**
 * Fixxa Scroll Indicator
 * Shows "Scroll for more" banner at bottom of scrollable containers on mobile
 */

(function() {
  // Only run on mobile
  if (window.innerWidth > 768) {
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollIndicators);
  } else {
    initScrollIndicators();
  }

  function initScrollIndicators() {
    // Containers that might have scrollable content
    const containers = [
      { selector: '#bookingsList', minItems: 3 },
      { selector: '#jobsList', minItems: 3 },
      { selector: '#completionRequestsList', minItems: 2 },
      { selector: '#myReviewsList', minItems: 2 },
      { selector: '.workers-grid', minItems: 5 },
      { selector: '#reviews-list', minItems: 4 },
      { selector: '.bookings', minItems: 3 },
      { selector: '.active-jobs', minItems: 3 }
    ];

    containers.forEach(config => {
      const container = document.querySelector(config.selector);
      if (!container) return;

      // Check if container has enough items to scroll
      const items = container.children.length;
      if (items < config.minItems) return;

      // Check if container is actually scrollable (content taller than viewport)
      const isScrollable = container.scrollHeight > window.innerHeight * 0.6;
      if (!isScrollable) return;

      // Add scroll indicator
      addScrollIndicator(container);
    });

    console.log('Scroll indicators initialized');
  }

  function addScrollIndicator(container) {
    // Don't add if already exists
    if (container.querySelector('.scroll-indicator')) {
      return;
    }

    // Create indicator element
    const indicator = document.createElement('div');
    indicator.className = 'scroll-indicator';
    indicator.innerHTML = `
      <span class="scroll-indicator-icon">↓</span>
      <span>Scroll for more</span>
    `;

    // Add to container
    container.style.position = 'relative';
    container.appendChild(indicator);

    // Hide indicator when user scrolls near bottom
    let hideTimeout;
    const checkScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const containerTop = container.offsetTop;
      const containerHeight = container.offsetHeight;
      const windowHeight = window.innerHeight;

      // Calculate if user is near the container's bottom
      const distanceFromContainerBottom = (containerTop + containerHeight) - (scrollTop + windowHeight);

      if (distanceFromContainerBottom < 100) {
        // User is near bottom, fade out indicator
        indicator.style.opacity = '0';
        indicator.style.transition = 'opacity 0.3s ease';

        // Remove after fade
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          if (indicator.parentNode) {
            indicator.remove();
          }
        }, 500);
      } else {
        indicator.style.opacity = '1';
      }
    };

    // Listen for scroll events
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(checkScroll, 100);
    }, { passive: true });

    // Initial check
    setTimeout(checkScroll, 1000);
  }

  // Re-initialize on dynamic content changes
  // (for pages that load content via AJAX)
  const observer = new MutationObserver(() => {
    setTimeout(initScrollIndicators, 500);
  });

  // Observe body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
