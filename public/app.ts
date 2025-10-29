document.addEventListener('DOMContentLoaded', () => {
  // Theme toggle logic
  const themeBtn = document.getElementById('themeBtn') as HTMLButtonElement | null;
  function setTheme(light: boolean) {
    document.body.classList.toggle('light', light);
    if (themeBtn) themeBtn.textContent = light ? '🌞' : '🌙';
  }

  // Initialize
  try {
    setTheme(localStorage.getItem('theme') === 'light');
  } catch (e) {
    setTheme(false);
  }

  themeBtn?.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light');
    setTheme(isLight);
    try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) {}
  });

  // Swipe gesture for theme switching (touch)
  let touchStartX: number | null = null;
  document.body.addEventListener('touchstart', e => {
    if (e.touches && e.touches.length === 1) touchStartX = e.touches[0].clientX;
  }, {passive:true});
  document.body.addEventListener('touchend', e => {
    if (touchStartX !== null && e.changedTouches && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 80) themeBtn?.click();
    }
    touchStartX = null;
  });

  // Form submit logic
  const form = document.getElementById('form') as HTMLFormElement | null;
  const out = document.getElementById('out') as HTMLElement | null;
  const statusEl = document.getElementById('status') as HTMLElement | null;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (out) out.innerHTML = '';
    if (statusEl) statusEl.textContent = 'Generating…';

    const formData = new FormData(form as HTMLFormElement);
    const body = new URLSearchParams(formData as any);

    try {
      const res = await fetch('/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error((err && (err.message || JSON.stringify(err))) || res.statusText);
      }

      const data = await res.json() as { recipes?: Array<{title?: string; desc?: string}> };
      if (statusEl) statusEl.textContent = '';
      if (!data.recipes?.length) {
        if (out) out.innerHTML = '<div class="err">No recipes returned.</div>';
        return;
      }

      if (out) out.innerHTML = data.recipes.map(r => `
        <div class="card">
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.desc)}</p>
        </div>
      `).join('');

    } catch (err: any) {
      if (statusEl) statusEl.textContent = '';
      if (out) out.innerHTML = '<div class="err">Error: ' + escapeHtml(err.message || String(err)) + '</div>';
    }
  });

  // small helper to avoid injecting raw HTML
  function escapeHtml(str: any){
    if (str == null) return '';
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

});
