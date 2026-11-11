/* Page transitions between the home and the legal pages (wine curtain),
   plus smooth scroll, link effects and entrance animations on the legal pages. */
(() => {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isLegal = d.body.classList.contains('legal');
  const curtain = d.querySelector('.pt');
  const EASE = 'cubic-bezier(.7,0,.2,1)';

  /* ---------- leave: curtain rises from the bottom, then navigate ---------- */
  let leaving = false;
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !curtain || leaving) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (!/(\.html|\/)$/.test(url.pathname) && !/\/(aviso-legal|privacidad|index)$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // in-page anchor
    e.preventDefault();
    leaving = true;
    if (RM) { location.href = url.href; return; }
    curtain.style.visibility = 'visible';
    curtain.animate(
      [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
      { duration: 750, easing: EASE, fill: 'forwards' }
    ).finished.then(() => { location.href = url.href; });
  });

  // back/forward cache: never come back with the curtain closed
  addEventListener('pageshow', e => {
    if (!e.persisted || !curtain) return;
    leaving = false;
    curtain.getAnimations().forEach(an => an.cancel());
    curtain.style.visibility = '';
    root.classList.remove('pt-in');
    root.classList.add('pt-done');
  });

  if (!isLegal) return;

  /* ---------- legal pages: enter (curtain leaves upwards) ---------- */
  const main = d.querySelector('.legal__main');
  [...main.children].forEach((el, i) => el.style.setProperty('--i', Math.min(i, 14)));

  const enter = () => {
    if (RM || !curtain) { root.classList.remove('pt-in'); root.classList.add('pt-done'); return; }
    curtain.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
      { duration: 900, delay: 120, easing: EASE, fill: 'forwards' }
    ).finished.then(() => { root.classList.remove('pt-in'); curtain.getAnimations().forEach(an => an.cancel()); });
    setTimeout(() => root.classList.add('pt-done'), 420);
  };
  if (d.readyState === 'complete') enter(); else addEventListener('load', enter, { once: true });

  /* ---------- roll effect on header links ---------- */
  d.querySelectorAll('.roll').forEach(el => {
    if (el.querySelector('.roll__in')) return;
    const t = el.textContent.trim();
    el.textContent = '';
    const s = d.createElement('span');
    s.className = 'roll__in'; s.dataset.t = t; s.textContent = t;
    el.appendChild(s);
  });

  /* ---------- smooth scroll ---------- */
  if (FINE && !RM && window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.095, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
})();
