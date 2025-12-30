// ==================== Auth Check ====================
async function checkAuth(redirectIfNot = true) {
  try {
    const res = await fetch('/check-auth', { credentials: 'include' });
    const data = await res.json();

    if (data.authenticated) {
      // ✅ User is logged in
      // Update UI globally if needed
      document.querySelectorAll('#loginLink').forEach(el => el.style.display = 'none');

      // Show inbox icon
      const inboxIconLink = document.getElementById('inboxIconLink');
      if (inboxIconLink) inboxIconLink.classList.add('show');

      // Show user menu with profile icon
      const userMenu = document.getElementById('userMenu');
      if (userMenu) userMenu.classList.add('show');

      return data.user;
    } else {
      // ❌ Not logged in -> redirect
      if (redirectIfNot) window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    if (redirectIfNot) window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }
}

// ==================== Initial Check ====================
checkAuth();

// ==================== Idle Re-check ====================
// Run every 1 min to catch expired sessions
setInterval(checkAuth, 60 * 1000);
