// Ends the boot loader defined inline in index.html. The loader handles its
// own minimum display time and exit animation.
export function hideBoot() {
  if (typeof window.__bootFinish === 'function') {
    window.__bootFinish();
    return;
  }
  const el = document.getElementById('boot');
  if (!el || el.classList.contains('done')) return;
  el.classList.add('done');
  setTimeout(() => el.remove(), 700);
}
