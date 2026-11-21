// Fades out the static boot screen defined in index.html.
export function hideBoot() {
  const el = document.getElementById('boot');
  if (!el || el.classList.contains('done')) return;
  el.classList.add('done');
  setTimeout(() => el.remove(), 700);
}
