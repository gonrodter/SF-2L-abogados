(() => {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mqMobile = matchMedia('(max-width: 760px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = t => t * t * (3 - 2 * t);
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];

  let vh = innerHeight, vw = innerWidth, sy = scrollY;
  let lenis = null;

  /* ---------- year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- roll links ---------- */
  $$('.roll').forEach(el => {
    if (el.querySelector('.roll__in')) return;
    const t = el.textContent.trim();
    el.innerHTML = '';
    const s = d.createElement('span');
    s.className = 'roll__in';
    s.dataset.t = t;
    s.textContent = t;
    el.appendChild(s);
  });

  /* ---------- split words ---------- */
  $$('[data-split]').forEach(el => {
    let wi = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            const w = d.createElement('span'); w.className = 'w';
            const i = d.createElement('span'); i.textContent = part; i.style.setProperty('--wi', wi++);
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
  });

  /* ---------- fill text (letters light up with scroll) ---------- */
  const fills = $$('[data-fill]').map(el => {
    let units;
    if (el.dataset.fill === 'lines') {
      units = [...el.children];
    } else {
      const text = el.textContent.trim();
      el.textContent = '';
      const sr = d.createElement('span'); sr.className = 'sr'; sr.textContent = text; el.appendChild(sr);
      units = [];
      text.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(d.createTextNode(' ')); return; }
        const w = d.createElement('span'); w.className = 'fw'; w.setAttribute('aria-hidden', 'true');
        [...part].forEach(c => { const s = d.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); units.push(s); });
        el.appendChild(w);
      });
    }
    return { el, units, lit: 0, top: 0, h: 0 };
  });

  /* ---------- reveal on view ---------- */
  const countUp = el => {
    const raw = el.dataset.count;
    const target = parseFloat(raw.replace(',', '.'));
    const dec = (raw.split(/[,.]/)[1] || '').length;
    const fmt = v => v.toFixed(dec).replace('.', ',');
    if (RM) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1800;
    const step = now => {
      const k = clamp((now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('is-in');
      if (el.dataset.count !== undefined && !el.dataset.done) { el.dataset.done = 1; countUp(el); }
      $$('[data-count]', el).forEach(c => { if (!c.dataset.done) { c.dataset.done = 1; countUp(c); } });
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

  const heroEls = $$('.hero [data-split]');
  $$('[data-reveal],[data-split],[data-lines],[data-img],.cta-card,.step,.foot__mark,[data-count]').forEach(el => {
    if (heroEls.includes(el)) return;
    io.observe(el);
  });
  const heroMarkEl = $('#hero-mark');
  const showHero = (instantMark) => {
    heroEls.forEach((el, i) => { el.style.setProperty('--d', i * 160); el.classList.add('is-in'); });
    if (instantMark) {
      heroMarkEl.classList.add('no-anim', 'is-in');
      requestAnimationFrame(() => requestAnimationFrame(() => heroMarkEl.classList.remove('no-anim')));
    } else {
      setTimeout(() => heroMarkEl.classList.add('is-in'), 120);
    }
  };

  /* ---------- measure ---------- */
  const hero = $('.hero');
  const reel = $('#reel');
  const cubePin = $('#cube-pin');
  const cubes = $$('[data-cube]');
  const cubeN = $('[data-cube-n]');
  const cubeBar = $('[data-cube-bar]');
  const hpin = $('#hpin');
  const htrack = $('#htrack');
  const hdr = $('#hdr');
  const mbar = $('#mbar');
  const foot = $('.foot');
  const speeds = $$('[data-speed]').map(el => ({ el, s: parseFloat(el.dataset.speed), top: 0, h: 0 }));
  const paras = $$('[data-parallax]').map(el => ({ el, box: el.parentElement, top: 0, h: 0 }));
  const quotes = $$('.quote');
  const steps = $$('.step').map(el => ({ el, top: 0 }));
  let activeStep = -1, targetStep = -1, lastStepT = 0, exitDown = false, lastDy = 1;
  const STEP_GAP = 420; // ms between one step and the next, so fast scrolling still shows each step
  steps.forEach((o, i) => { o.i = i; });
  function stepTick(now) {
    if (targetStep === activeStep) return;
    const lastS = steps[steps.length - 1];
    const offscreen = lastS.top + lastS.h < sy || steps[0].top > sy + vh;
    if (!offscreen && now - lastStepT < STEP_GAP) return;
    let next;
    if (offscreen) next = targetStep;                              // nobody sees it, no need to walk through rows
    else if (targetStep === -1 && exitDown) next = -1;            // leaving the list downwards
    else if (activeStep === -1) next = lastDy < 0 ? steps.length - 1 : 0; // entering from below starts at the last row
    else next = activeStep + (targetStep > activeStep ? 1 : -1);  // move one row at a time
    const up = next !== -1 ? (activeStep === -1 ? lastDy < 0 : next < activeStep) : !exitDown;
    stepsBox.classList.toggle('is-up', up);
    steps.forEach((o, i) => o.el.classList.toggle('is-active', i === next));
    activeStep = next;
    lastStepT = now;
  }
  const stepsBox = $('.steps');
  const M = {};

  const absTop = el => { let t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; };

  function measure() {
    vh = innerHeight; vw = innerWidth;
    M.heroTop = absTop(hero); M.heroH = hero.offsetHeight;
    const st = reel.parentElement.getBoundingClientRect();
    const rel = el => { const r = el.getBoundingClientRect(); return { t: r.top - st.top, l: r.left - st.left, r: st.right - r.right, b: st.bottom - r.bottom }; };
    M.from = rel($('.reel-from')); M.to = rel($('.reel-to'));
    M.stW = st.width; M.stH = st.height;
    M.cubeTop = absTop(cubePin); M.cubeH = cubePin.offsetHeight;
    if (!mqMobile.matches) {
      const tw = htrack.scrollWidth;
      M.hDist = Math.max(0, tw - vw);
      hpin.style.height = (M.hDist + vh) + 'px';
    } else {
      hpin.style.height = '';
      htrack.style.transform = '';
      M.hDist = 0;
    }
    M.hTop = absTop(hpin); M.hH = hpin.offsetHeight;
    M.footTop = absTop(foot);
    fills.forEach(f => { f.top = absTop(f.el); f.h = f.el.offsetHeight; });
    steps.forEach(o => { o.top = absTop(o.el); o.h = o.el.offsetHeight; });
    // stacked in one column on mobile: no parallax there, or the cards would overlap
    speeds.forEach(o => { o.el.style.translate = ''; o.top = absTop(o.el); o.h = o.el.offsetHeight; });
    paras.forEach(o => { o.top = absTop(o.box); o.h = o.box.offsetHeight; });
    update(true);
  }

  /* ---------- per-frame update ---------- */
  let lastY = -1, hdrHidden = false, lastDir = 0;
  function update(force) {
    sy = scrollY;
    if (!force && sy === lastY) return;
    const dy = sy - lastY;
    lastY = sy;

    // header
    hdr.classList.toggle('is-scrolled', sy > 10);
    if (!root.classList.contains('menu-open')) {
      if (dy > 4 && sy > vh * 0.6 && !hdrHidden) { hdr.classList.add('is-hidden'); hdrHidden = true; }
      else if (dy < -4 && hdrHidden) { hdr.classList.remove('is-hidden'); hdrHidden = false; }
    }
    if (mbar) mbar.classList.toggle('is-on', sy > vh * 0.9 && sy + vh < M.footTop + vh * 0.35);

    // hero reel expansion
    const hp = clamp((sy - M.heroTop) / ((M.heroH - vh) * 0.78));
    const pe = RM ? hp : smooth(hp);
    hero.style.setProperty('--p', pe.toFixed(4));
    reel.classList.toggle('is-full', hp > 0.92);
    paintReel(pe);

    // fill text
    fills.forEach(f => {
      const start = f.top - vh * 0.88;
      const len = Math.max(vh * 0.5, f.h * 0.9);
      const p = clamp((sy - start) / len);
      const n = Math.round(p * f.units.length);
      if (n === f.lit) return;
      const [a, b, on] = n > f.lit ? [f.lit, n, true] : [n, f.lit, false];
      for (let i = a; i < b; i++) f.units[i].classList.toggle('on', on);
      f.lit = n;
    });

    // cube
    if (cubes.length) {
      const p = clamp((sy - M.cubeTop) / (M.cubeH - vh));
      const N = 3;
      const t = p * (N - 1);
      const seg = Math.min(N - 2, Math.floor(t));
      const f = t - seg;
      const k = smooth(clamp((f - 0.18) / 0.64));
      const ang = (seg + k) * 90;
      cubes.forEach(c => c.style.setProperty('--rx', (ang * (c.dataset.dir === '-1' ? -1 : 1)).toFixed(2) + 'deg'));
      if (cubeN) cubeN.textContent = '0' + (Math.min(N - 1, Math.round(seg + k)) + 1);
      if (cubeBar) cubeBar.style.setProperty('--cp', p.toFixed(4));
    }

    // horizontal gallery
    if (M.hDist) {
      const p = clamp((sy - M.hTop) / (M.hH - vh));
      htrack.style.transform = `translate3d(${(-p * M.hDist).toFixed(1)}px,0,0)`;
    }

    // method steps: the row that reaches 72% of the screen turns white, one at a time
    if (steps.length) {
      const line = sy + vh * 0.72;
      let a = -1;
      steps.forEach((o, i) => { if (o.top <= line) a = i; });
      const last = steps[steps.length - 1];
      if (last.top + last.h < sy + vh * 0.12) a = -1;
      targetStep = a;
      if (dy) lastDy = dy;
      if (a === -1 && activeStep === last.i && dy > 0) exitDown = true;
      else if (a !== -1) exitDown = false;
    }

    // stacked quotes: the covered card shrinks and dims
    for (let i = 0; i < quotes.length - 1; i++) {
      const a = quotes[i].getBoundingClientRect(), b = quotes[i + 1].getBoundingClientRect();
      if (a.bottom < -50 || a.top > vh) continue;
      const k = clamp(1 - (b.top - a.top) / (vh * 0.7));
      quotes[i].style.transform = `scale(${(1 - k * 0.06).toFixed(4)})`;
      quotes[i].style.setProperty('--shade', (k * 0.55).toFixed(3));
    }

    // parallax
    if (!RM) {
      if (!mqMobile.matches) speeds.forEach(o => {
        const c = o.top + o.h / 2 - sy - vh / 2;
        if (Math.abs(c) > vh * 1.5) return;
        o.el.style.translate = `0 ${(c * o.s).toFixed(1)}px`;
      });
      paras.forEach(o => {
        const c = (o.top + o.h / 2 - sy - vh / 2) / vh;
        if (Math.abs(c) > 1.5) return;
        o.el.style.transform = `translate3d(0,${(c * -7).toFixed(2)}%,0)`;
      });
    }
  }

  /* ---------- reel box (grows from the hero column to full screen) ---------- */
  const slideEls = $$('.reel__slide');
  let reelReveal = 0, reelP = 0;
  function paintReel(p) {
    if (p !== undefined) reelP = p;
    if (!M.from) return;
    const L = (a, b) => a + (b - a) * reelP;
    const t = L(M.from.t, M.to.t), r = L(M.from.r, M.to.r), b = L(M.from.b, M.to.b), l = L(M.from.l, M.to.l);
    const W = M.stW, H = M.stH;
    const bw = W - l - r, bh = H - t - b;
    const top = t + bh * (1 - reelReveal);
    reel.style.clipPath = `inset(${top.toFixed(1)}px ${r.toFixed(1)}px ${b.toFixed(1)}px ${l.toFixed(1)}px)`;
    const s = Math.max(bw / W, bh / H);
    const mob = mqMobile.matches;
    slideEls.forEach(el => {
      const f = (mob ? el.dataset.focalM : el.dataset.focal) || '.5 .5';
      const [fx, fy] = f.split(' ').map(Number);
      const img = el.querySelector('img');
      const o = `${fx * 100}% ${fy * 100}%`;
      if (img.style.transformOrigin !== o) img.style.transformOrigin = o; // the slow zoom keeps the focal point in place
      const ex = fx + (0.5 - fx) * reelP, ey = fy + (0.5 - fy) * reelP;
      let tx = l + bw / 2 - W / 2 - (W * ex - W / 2) * s;
      let ty = t + bh / 2 - H / 2 - (H * ey - H / 2) * s;
      // keep the image covering the box
      tx = clamp(tx, l + bw - W / 2 - (W / 2) * s, l - W / 2 + (W / 2) * s);
      ty = clamp(ty, t + bh - H / 2 - (H / 2) * s, t - H / 2 + (H / 2) * s);
      el.style.transform = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    });
  }
  function revealReel() {
    if (RM) { reelReveal = 1; paintReel(); return; }
    const t0 = performance.now(), dur = 1500;
    const step = now => {
      const k = clamp((now - t0) / dur);
      reelReveal = 1 - Math.pow(1 - k, 4);
      paintReel();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- reel slideshow ---------- */
  const slides = $$('.reel__slide');
  const dots = $$('.reel__dots i');
  let slideI = 0;
  const nextSlide = () => {
    slides[slideI].classList.remove('is-on'); dots[slideI].classList.remove('is-on');
    slideI = (slideI + 1) % slides.length;
    slides[slideI].classList.add('is-on');
    void dots[slideI].offsetWidth; dots[slideI].classList.add('is-on');
  };
  const startSlides = () => { if (!RM) setInterval(() => { if (!d.hidden) nextSlide(); }, 5000); };

  /* ---------- smooth scroll ---------- */
  if (FINE && !RM && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.095, smoothWheel: true });
  }
  const scrollToEl = (target) => {
    const y = target === 'top' ? 0 : absTop(target) - (target.id === 'contacto' ? 0 : 0);
    if (lenis) lenis.scrollTo(y, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
    else scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  };
  d.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = id === 'top' ? 'top' : d.getElementById(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(target);
    if (id !== 'top') history.replaceState(null, '', '#' + id);
  });

  /* ---------- menu ---------- */
  const burger = $('.burger');
  const menu = $('#menu');
  function closeMenu() {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    menu.setAttribute('aria-hidden', 'true');
    lenis && lenis.start();
  }
  burger.addEventListener('click', () => {
    if (root.classList.contains('menu-open')) return closeMenu();
    root.classList.add('menu-open');
    hdr.classList.remove('is-hidden'); hdrHidden = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    menu.setAttribute('aria-hidden', 'false');
    lenis && lenis.stop();
  });
  d.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- cursor ---------- */
  const cursor = $('.cursor');
  if (FINE && cursor) {
    const txt = $('.cursor__txt', cursor);
    let cx = -200, cy = -200, tx = -200, ty = -200;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    d.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t) { txt.textContent = t.dataset.cursor; cursor.classList.add('is-on'); }
    });
    d.addEventListener('mouseout', e => {
      const t = e.target.closest('[data-cursor]');
      if (t && !t.contains(e.relatedTarget)) cursor.classList.remove('is-on');
    });
    const loopC = () => {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cursor.style.setProperty('--cx', cx.toFixed(1) + 'px');
      cursor.style.setProperty('--cy', cy.toFixed(1) + 'px');
      requestAnimationFrame(loopC);
    };
    requestAnimationFrame(loopC);
  }

  /* ---------- hero logo follows the mouse a little ---------- */
  if (FINE && !RM) {
    let mx = 0, my = 0, tx = 0, ty = 0;
    hero.addEventListener('mousemove', e => {
      tx = (e.clientX / vw) * 2 - 1;
      ty = (e.clientY / vh) * 2 - 1;
    }, { passive: true });
    hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
    const loopM = () => {
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      if (Math.abs(tx - mx) > 0.001 || Math.abs(ty - my) > 0.001) {
        heroMarkEl.style.setProperty('--mx', mx.toFixed(4));
        heroMarkEl.style.setProperty('--my', my.toFixed(4));
      }
      requestAnimationFrame(loopM);
    };
    requestAnimationFrame(loopM);
  }

  /* ---------- map on demand ---------- */
  const mapBtn = $('[data-map]');
  mapBtn && mapBtn.addEventListener('click', () => {
    const box = $('#map');
    if (!box.firstChild) {
      const f = d.createElement('iframe');
      f.title = 'Mapa: C/ Monte Carmelo, 32, Sevilla';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.src = 'https://www.google.com/maps?q=C.%20Monte%20Carmelo%2C%2032%2C%20Local%201B%2C%2041011%20Sevilla&output=embed';
      box.appendChild(f);
    }
    box.hidden = !box.hidden;
    mapBtn.textContent = box.hidden ? 'Ver mapa' : 'Ocultar mapa';
    requestAnimationFrame(measure);
  });

  /* ---------- contact form: validation + send (FormSubmit) ---------- */
  // Recipient. FormSubmit asks the inbox to confirm once (activation email on the first send).
  // After activating, swap the address for the random alias FormSubmit sends, so it is not public.
  // TESTING: developer's inbox. Change to sf2labogados@gmail.com when approved.
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/rodriguez.terron.gonzalo@gmail.com';
  const form = $('#form');
  if (form) {
    const F = form.elements;
    const msg = $('.form__msg', form);
    const count = $('.field__count', form);
    const val = n => (F[n].value || '').trim();
    const digits = s => s.replace(/[\s.\-()]/g, '');
    const phoneOk = s => {
      const d = digits(s);
      if (/^(\+34|0034)?[6789]\d{8}$/.test(d)) return true;          // España
      return /^(\+|00)[1-9]\d{7,14}$/.test(d);                          // internacional
    };
    const emailOk = s => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i.test(s);
    const rules = {
      nombre: () => {
        const v = val('nombre');
        if (!v) return 'Escribe tu nombre';
        if (v.length < 2) return 'El nombre es demasiado corto';
        if (/\d/.test(v)) return 'El nombre no debería llevar números';
        return '';
      },
      telefono: () => {
        const v = val('telefono');
        if (!v && !val('email')) return 'Déjanos un teléfono o un email para poder responderte';
        if (v && !phoneOk(v)) return 'Revisa el teléfono, debe tener 9 cifras (o prefijo internacional)';
        return '';
      },
      email: () => {
        const v = val('email');
        if (!v && !val('telefono')) return '__pair';
        if (v && !emailOk(v)) return 'Revisa el email, parece incompleto (p. ej. nombre@correo.com)';
        return '';
      },
      mensaje: () => {
        const v = val('mensaje');
        if (!v) return 'Cuéntanos brevemente tu caso';
        if (v.length < 15) return 'Cuéntanos un poco más, con una o dos frases basta';
        return '';
      },
      privacidad: () => F.privacidad.checked ? '' : 'Necesitamos que aceptes la política de privacidad'
    };
    const touched = new Set();
    let submitted = false;

    const show = (name) => {
      const err = rules[name]();
      const input = F[name];
      const box = input.closest('.field,.check');
      const slot = $('#err-' + name);
      box.classList.toggle('is-bad', !!err);
      box.classList.toggle('no-msg', err === '__pair');
      box.classList.toggle('is-ok', !err && name !== 'privacidad' && !!val(name));
      input.setAttribute('aria-invalid', err ? 'true' : 'false');
      if (err && err !== '__pair') slot.textContent = err;
      return !err;
    };
    // phone and email depend on each other
    const linked = { telefono: 'email', email: 'telefono' };

    Object.keys(rules).forEach(name => {
      const input = F[name];
      input.addEventListener('blur', () => {
        if (name === 'privacidad') return;
        if (val(name) || submitted) { touched.add(name); show(name); }
      });
      input.addEventListener(name === 'privacidad' ? 'change' : 'input', () => {
        if (name === 'mensaje' && count) count.textContent = `${F.mensaje.value.length}/1500`;
        if (msg.classList.contains('is-error')) { msg.textContent = ''; msg.classList.remove('is-error'); }
        if (touched.has(name) || submitted || name === 'privacidad') show(name);
        const other = linked[name];
        if (other && (touched.has(other) || submitted)) show(other);
      });
    });

    const btn = $('.form__send', form);
    const btnLabel = $('.roll__in', btn);
    let sending = false;
    const setBtn = (label, busy) => {
      btnLabel.textContent = label; btnLabel.dataset.t = label;
      btn.disabled = busy; btn.classList.toggle('is-busy', busy);
    };
    async function sendForm() {
      if (sending) return;
      sending = true;
      setBtn('Enviando…', true);
      msg.classList.remove('is-ok', 'is-error');
      msg.textContent = '';
      const payload = {
        nombre: val('nombre'), telefono: val('telefono'), email: val('email'), mensaje: val('mensaje'),
        area: (form.querySelector('input[name="area"]:checked') || {}).value || 'Otro asunto',
        privacidad: F.privacidad.checked,
        empresa: F.empresa ? F.empresa.value : ''
      };
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            Nombre: payload.nombre,
            'Teléfono': payload.telefono || '—',
            ...(payload.email ? { email: payload.email } : {}), // FormSubmit sets reply-to from "email"
            Asunto: payload.area,
            Mensaje: payload.mensaje,
            _subject: `Consulta web · ${payload.area} · ${payload.nombre}`,
            _template: 'table',
            _captcha: 'false',
            _honey: payload.empresa
          }),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        const res = await r.json().catch(() => ({}));
        if (!r.ok || String(res.success) !== 'true') throw new Error(res.message || 'error');
        form.reset();
        touched.clear(); submitted = false;
        $$('.field,.check', form).forEach(b => b.classList.remove('is-ok', 'is-bad', 'no-msg'));
        if (count) count.textContent = '0/1500';
        form.classList.add('is-sent');
        msg.classList.add('is-ok');
        msg.textContent = `Gracias${payload.nombre ? ', ' + payload.nombre.split(' ')[0] : ''}. Hemos recibido tu mensaje y te responderemos lo antes posible.`;
        setBtn('Mensaje enviado', true);
        setTimeout(() => { form.classList.remove('is-sent'); setBtn('Enviar mensaje', false); }, 6000);
      } catch (err) {
        msg.classList.add('is-error');
        msg.innerHTML = 'No hemos podido enviar el mensaje. Inténtalo de nuevo o llámanos al <a href="tel:+34600785104">600 785 104</a>.';
        setBtn('Enviar mensaje', false);
      } finally {
        sending = false;
      }
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitted = true;
      const names = Object.keys(rules);
      const bad = names.filter(n => !show(n));
      msg.classList.remove('is-ok', 'is-error');
      if (bad.length) {
        msg.classList.add('is-error');
        msg.textContent = bad.length === 1 ? 'Revisa el campo marcado en rojo' : `Revisa los ${bad.length} campos marcados en rojo`;
        const first = F[bad[0]];
        const box = first.closest('.field,.check');
        box.classList.remove('is-shake'); void box.offsetWidth; box.classList.add('is-shake');
        if (lenis) lenis.scrollTo(box, { offset: -140, duration: 0.8 });
        first.focus({ preventScroll: !!lenis });
        return;
      }
      sendForm();
    });
  }

  /* ---------- loader / intro ---------- */
  function intro() {
    const loader = $('#loader');
    const heroMark = $('#hero-mark');
    let played = false;
    const finish = () => {
      root.classList.add('intro-done');
      loader && loader.remove();
      showHero(played);
      hdr.classList.add('is-in');
      setTimeout(revealReel, 250);
      dots[0].classList.remove('is-on'); void dots[0].offsetWidth; dots[0].classList.add('is-on');
      startSlides();
      lenis && lenis.start();
    };
    if (!loader || root.classList.contains('intro-seen') || RM) { finish(); return; }

    played = true;
    heroMarkEl.classList.add('no-anim', 'is-in');
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    lenis && lenis.stop();

    const glyphs = $$('.lg', loader);
    glyphs.forEach(g => {
      const u = heroMark.querySelector(`use[data-g="${g.dataset.g}"]`);
      try { const b = u.getBBox(); if (b.width) g.setAttribute('viewBox', `${b.x} ${b.y} ${b.width} ${b.height}`); } catch (e) {}
    });
    const ins = glyphs.map((g, i) => g.animate(
      [{ transform: 'translateY(35%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 1100, delay: 120 + i * 85, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }
    ));

    // counter tied to time + page load
    const countEl = $('[data-loader-count]', loader);
    const t0 = performance.now();
    let loaded = d.readyState === 'complete';
    addEventListener('load', () => { loaded = true; }, { once: true });
    const MIN = 1900;
    const tick = now => {
      const el = now - t0;
      const tp = clamp(el / MIN);
      const cap = loaded ? 1 : 0.9;
      const v = Math.min(tp, cap);
      countEl.textContent = Math.round(v * 100);
      if (v < 1) requestAnimationFrame(tick); else exit();
    };
    requestAnimationFrame(tick);
    // safety: never block more than 6s
    const safety = setTimeout(() => { loaded = true; }, 6000);

    function exit() {
      clearTimeout(safety);
      const bg = $('.loader__bg', loader);
      const meta = $('.loader__meta', loader);
      meta.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
      const DUR = 1350;
      const inView = heroMark.getBoundingClientRect().top < vh;
      glyphs.forEach((g, i) => {
        ins[i].cancel();
        g.style.opacity = 1;
        const u = heroMark.querySelector(`use[data-g="${g.dataset.g}"]`);
        const a = g.getBoundingClientRect();
        const b = u.getBoundingClientRect();
        if (!inView || !a.width || !b.width) {
          g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
          return;
        }
        const dx = b.left - a.left, dy = b.top - a.top;
        const sx = b.width / a.width, sY = b.height / a.height;
        g.style.transformOrigin = '0 0';
        g.animate(
          [{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(${sx},${sY})` }],
          { duration: DUR, delay: i * 45, easing: 'cubic-bezier(.7,0,.12,1)', fill: 'forwards' }
        );
      });
      bg.animate(
        [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
        { duration: 1150, delay: 380, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }
      );
      setTimeout(() => {
        root.classList.add('intro-done');
        requestAnimationFrame(() => setTimeout(finish, 60));
      }, DUR + glyphs.length * 45);
    }
  }

  /* ---------- loop ---------- */
  function raf(t) {
    if (lenis) lenis.raf(t);
    update(false);
    if (steps.length) stepTick(t);
    requestAnimationFrame(raf);
  }

  let rT;
  const onResize = () => { clearTimeout(rT); rT = setTimeout(measure, 120); };
  addEventListener('resize', () => { if (Math.abs(innerWidth - vw) > 2 || !mqMobile.matches) onResize(); });
  addEventListener('load', measure);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
  if ('ResizeObserver' in window) {
    let lastH = 0;
    new ResizeObserver(() => { const h = d.body.scrollHeight; if (Math.abs(h - lastH) > 40) { lastH = h; onResize(); } }).observe(d.body);
  }

  measure();
  requestAnimationFrame(raf);
  intro();
})();
