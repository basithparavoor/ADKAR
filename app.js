/* app.js — shared site JS for Adkar (updated with resource handlers)
   - Theme toggle (icon + persisted state)
   - Mobile off-canvas menu open/close (backdrop + Esc)
   - Keyboard shortcut '/' to focus search box (if present)
   - Rotating verses (if #verse-display exists; reads data-verses)
   - Resource actions: view preview, download, open playlist
   - Defensive: safe no-op when elements not present
*/

(function () {
  const $ = (sel, ctx = document) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

  /* ---------------------------
     THEME TOGGLE
  --------------------------- */
  function initThemeToggle() {
    const toggle = $('#theme-toggle');
    if (!toggle) return;

    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', toggle.getAttribute('aria-label') || 'Toggle color theme');
    toggle.classList.add('focus-outline');

    // Create icon if missing
    let svg = toggle.querySelector('svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.innerHTML = '<path id="theme-path" stroke-width="1.8" stroke-linecap="round"></path>';
      toggle.appendChild(svg);
    }
    const path = svg.querySelector('#theme-path');

    const sun = 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4';
    const moon = 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';

    function setIcon(isDark) { if (path) path.setAttribute('d', isDark ? moon : sun); }
    function applyTheme(isDark) {
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      setIcon(isDark);
      try { localStorage.setItem('adkar-theme', isDark ? 'dark' : 'light'); } catch (e) { /* ignore */ }
    }

    const saved = (() => { try { return localStorage.getItem('adkar-theme'); } catch (e) { return null; } })();
    if (saved) applyTheme(saved === 'dark');
    else applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    toggle.addEventListener('click', () => {
      applyTheme(!document.documentElement.classList.contains('dark'));
    });
  }

  /* ---------------------------
     MOBILE MENU
  --------------------------- */
  function initMobileMenu() {
    const menu = $('#mobile-menu');
    const btn = $('#mobile-menu-button');
    const closeBtn = $('#mobile-menu-close');
    const backdrop = $('#mobile-menu-backdrop');

    if (!menu || !btn) return;

    menu.style.transform = 'translateX(100%)';
    menu.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');

    const openMenu = () => {
      menu.style.transform = 'translateX(0)';
      menu.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
      const first = menu.querySelector('a,button,[tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      menu.style.transform = 'translateX(100%)';
      menu.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
      document.body.style.overflow = '';
    };

    btn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (backdrop) backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ---------------------------
     SEARCH SHORTCUT ('/')
  --------------------------- */
  function initSearchShortcut() {
    document.addEventListener('keydown', (e) => {
      const active = document.activeElement;
      if (active && /input|textarea/i.test(active.tagName)) return;
      if (e.key === '/') {
        const search = $('#search') || document.querySelector('input[type="search"]');
        if (search) { e.preventDefault(); search.focus(); if (search.select) search.select(); }
      }
    });
  }

  /* ---------------------------
     VERSE ROTATOR
  --------------------------- */
  function initVerseRotator() {
    const display = $('#verse-display');
    if (!display) return;

    let verses = [];
    if (display.dataset && display.dataset.verses) {
      try { verses = JSON.parse(display.dataset.verses); } catch (e) { verses = []; }
    }
    if (!verses || !verses.length) {
      verses = [
        { ar: 'وَاذْكُرُوا اللَّهَ كَثِيرًا لَعَلَّكُمْ تُفْلِحُونَ', ref: 'Al-Baqarah 2:200' },
        { ar: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', ref: 'Ash-Sharh 94:6' },
        { ar: 'فَاذْكُرُونِي أَذْكُرْكُمْ', ref: 'Al-Baqarah 2:152' }
      ];
    }

    const pauseBtn = $('#pause-verse');
    const nextBtn = $('#next-verse');
    const intervalMs = 6000;
    let idx = 0;
    let timer = null;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render(i) {
      const v = verses[i] || { ar: '', ref: '' };
      display.innerHTML = `<div class="font-arabic" lang="ar" dir="rtl">${v.ar}</div><div class="text-xs text-gray-500 mt-1">${v.ref || ''}</div>`;
      display.classList.remove('show');
      requestAnimationFrame(() => display.classList.add('show'));
    }

    function next() { idx = (idx + 1) % verses.length; render(idx); }
    function start() { stop(); timer = setInterval(next, intervalMs); if (pauseBtn) pauseBtn.textContent = 'Pause'; }
    function stop() { if (timer) clearInterval(timer); timer = null; if (pauseBtn) pauseBtn.textContent = 'Resume'; }

    if (pauseBtn) pauseBtn.addEventListener('click', () => { if (timer) stop(); else start(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); if (!timer) start(); });

    render(idx);
    if (!reduced) start();
  }

  /* ---------------------------
     RESOURCE ACTIONS
     Handles buttons with .resource-action and data-action:
       - view (preview modal)
       - download (download file)
       - playlist (open in new tab)
  --------------------------- */
  function initResourceActions() {
    const resourceButtons = $$('.resource-action');
    if (!resourceButtons || resourceButtons.length === 0) return;

    const statusEl = $('#resource-status') || document.createElement('div');

    // Modal elements
    const modal = $('#resource-modal');
    const modalBackdrop = $('#resource-modal-backdrop');
    const modalContent = $('#resource-modal-content');
    const modalClose = $('#resource-modal-close');
    const modalDownloadBtn = $('#resource-download-btn');

    // Focus trap basic implementation
    let lastFocused = null;
    function openModal() {
      if (!modal) return;
      lastFocused = document.activeElement;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      // focus close
      setTimeout(() => { modalClose?.focus(); }, 40);
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      if (!modal) return;
      modal.classList.add('hidden');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      if (lastFocused) lastFocused.focus();
      document.body.style.overflow = '';
      // clear content to release memory
      if (modalContent) modalContent.innerHTML = '';
      if (modalDownloadBtn) { modalDownloadBtn.removeAttribute('href'); modalDownloadBtn.removeAttribute('download'); }
    }

    // close handlers
    modalClose?.addEventListener('click', closeModal);
    (modalBackdrop)?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    async function downloadResource(url, filename, userFeedbackEl) {
      // Use fetch to attempt a blob download. If CORS blocks it, fallback to opening in a new tab.
      try {
        appendStatus(`Starting download: ${filename}...`, userFeedbackEl);
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(`Network response was not ok (${res.status})`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || '';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        appendStatus(`Download started: ${filename}`, userFeedbackEl);
      } catch (err) {
        // fallback: open the URL in new tab so user can download via browser
        appendStatus(`Could not download via fetch (CORS or network). Opening resource in new tab.`, userFeedbackEl);
        window.open(url, '_blank', 'noopener,noreferrer');
        console.error(err);
      }
    }

    function appendStatus(msg, el) {
      // prefer aria-live region
      const container = el || statusEl;
      if (container) {
        container.textContent = msg;
        // ensure screen readers announce changes
        container.setAttribute('aria-live', 'polite');
      } else {
        console.log('resource status:', msg);
      }
    }

    function openPreviewModal(url, type, filename) {
      if (!modal || !modalContent) {
        // fallback: open in new tab
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      modalContent.innerHTML = ''; // reset
      modalDownloadBtn.setAttribute('href', url);
      if (filename) modalDownloadBtn.setAttribute('download', filename);

      if (type === 'pdf') {
        // embed PDF in iframe if allowed
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.className = 'w-full h-full';
        iframe.setAttribute('title', `Preview ${filename || 'document'}`);
        iframe.setAttribute('loading', 'lazy');
        modalContent.appendChild(iframe);
      } else if (type === 'image') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = filename || 'Preview image';
        img.className = 'max-w-full h-auto block mx-auto';
        modalContent.appendChild(img);
      } else {
        // generic: try embedding in iframe
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.className = 'w-full h-full';
        iframe.setAttribute('title', `Preview ${filename || 'resource'}`);
        iframe.setAttribute('loading', 'lazy');
        modalContent.appendChild(iframe);
      }
      openModal();
    }

    // attach handlers
    resourceButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const action = btn.dataset.action;
        const url = btn.dataset.url;
        const type = btn.dataset.type || '';
        const filename = btn.dataset.filename || url?.split('/').pop() || 'download';

        if (!action || !url) {
          appendStatus('Resource is not available.', statusEl);
          return;
        }

        if (action === 'view') {
          appendStatus(`Opening preview: ${filename}`, statusEl);
          openPreviewModal(url, type, filename);
          return;
        }

        if (action === 'download') {
          appendStatus(`Preparing download: ${filename}`, statusEl);
          // disable button briefly to prevent double clicks
          btn.disabled = true;
          try {
            await downloadResource(url, filename, statusEl);
          } finally {
            btn.disabled = false;
          }
          return;
        }

        if (action === 'playlist') {
          // Open playlist in new tab
          appendStatus('Opening playlist in new tab', statusEl);
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }

        // unknown action
        appendStatus('Unknown action for this resource.', statusEl);
      });
    });
  }

  /* ---------------------------
     INIT
  --------------------------- */
  function init() {
    initThemeToggle();
    initMobileMenu();
    initSearchShortcut();
    initVerseRotator();
    initResourceActions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
