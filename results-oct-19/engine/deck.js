/* SLAP deck engine
 * - Fixed 1920x1080 stage, scaled to fit any window.
 * - Every element marked [data-a] animates in/out with a staggered offset.
 *   data-a values: up (default) | down | left | right | scale | fade | mask | blur
 *   data-d="120"  extra delay (ms) for that element
 *   data-count="1234"  number counts up on enter (data-prefix / data-suffix / data-decimals)
 * - Optional in-slide builds: elements with data-step="1", "2"... appear on later key presses.
 * Keys: → Space PageDown Enter = next · ← PageUp Backspace = back · Home/End · F = fullscreen
 *       G = grid overview · digits + Enter = jump · B = black screen
 */
(() => {
  const W = 1920, H = 1080;
  const EASE_IN = 'cubic-bezier(.16,1,.3,1)';   // expo-out: fast start, long soft landing
  const EASE_OUT = 'cubic-bezier(.7,0,.84,0)';  // expo-in for exits
  const STAGGER = 65, IN_DUR = 1100, OUT_STAGGER = 22, OUT_DUR = 420;

  const stage = document.querySelector('.stage');
  const slides = [...document.querySelectorAll('.slide')];
  const progress = document.querySelector('.progress > i');
  let index = -1, step = 0, busy = null, typed = '';

  /* ---------- word splitting: [data-split] headlines reveal word by word ---------- */
  document.querySelectorAll('[data-split]').forEach(el => {
    const gap = el.dataset.split || 55;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.dataset.a = 'rise'; i.dataset.gap = gap; i.textContent = part;
          if (el.dataset.step) i.dataset.step = el.dataset.step;
          w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
  });

  /* ---------- scaling ---------- */
  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener('resize', fit); fit();

  /* ---------- animation vocabulary ---------- */
  const OFF = 70;
  function frames(kind, dir) {
    // dir: +1 entering forward / leaving backward, -1 the mirror
    const t = {
      up:    [`translate3d(0,${OFF * dir}px,0)`, 'translate3d(0,0,0)'],
      down:  [`translate3d(0,${-OFF * dir}px,0)`, 'translate3d(0,0,0)'],
      left:  [`translate3d(${OFF * 1.4 * dir}px,0,0)`, 'translate3d(0,0,0)'],
      right: [`translate3d(${-OFF * 1.4 * dir}px,0,0)`, 'translate3d(0,0,0)'],
      scale: ['scale(.86)', 'scale(1)'],
      fade:  ['none', 'none'],
      blur:  ['scale(1.06)', 'scale(1)'],
      mask:  [`translate3d(0,${OFF * dir}px,0)`, 'translate3d(0,0,0)'],
      rise:  [`translate3d(0,${110 * dir}%,0) rotate(${4 * dir}deg)`, 'translate3d(0,0,0) rotate(0deg)'],
      grow:  ['scaleY(0)', 'scaleY(1)'],   // lines that draw themselves (set transform-origin in CSS)
    }[kind] || null;
    const from = { opacity: 0, transform: t[0], filter: kind === 'fade' ? 'none' : 'blur(10px)' };
    const to = { opacity: 1, transform: t[1], filter: 'blur(0px)' };
    if (kind === 'rise' || kind === 'grow') { from.filter = 'none'; to.filter = 'none'; }
    if (kind === 'mask') { from.clipPath = 'inset(0 0 100% 0)'; to.clipPath = 'inset(0 0 0% 0)'; from.filter = 'none'; to.filter = 'none'; }
    return [from, to];
  }

  const items = (slide, maxStep = Infinity) =>
    [...slide.querySelectorAll('[data-a]')].filter(el => (+el.dataset.step || 0) <= maxStep);

  function animateIn(els, dir, baseDelay = 0) {
    let t = 0;
    return els.map(el => {
      const [from, to] = frames(el.dataset.a || 'up', dir);
      const delay = baseDelay + t + (+el.dataset.d || 0);
      t += el.dataset.gap != null ? +el.dataset.gap : STAGGER;
      const a = el.animate([from, to], { duration: +el.dataset.dur || IN_DUR, delay, easing: EASE_IN, fill: 'both' });
      if (el.dataset.count != null) countUp(el, delay);
      return a;
    });
  }

  function animateOut(els, dir) {
    const list = dir > 0 ? els : [...els].reverse();
    return list.map((el, i) => {
      const [hidden, shown] = frames(el.dataset.a || 'up', -dir);
      return el.animate([shown, hidden], { duration: OUT_DUR, delay: Math.min(i * OUT_STAGGER, 260), easing: EASE_OUT, fill: 'both' });
    });
  }

  function countUp(el, delay) {
    const target = parseFloat(el.dataset.count), dec = +el.dataset.decimals || 0;
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const fmt = v => pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    el.textContent = fmt(0);
    const dur = 1600, t0 = performance.now() + delay;
    const tick = now => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1 && el.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const clear = slide => items(slide).forEach(el => el.getAnimations().forEach(a => a.cancel()));

  /* ---------- media ---------- */
  function media(slide, on) {
    slide.querySelectorAll('video').forEach(v => {
      if (on) { v.currentTime = 0; v.play().catch(() => {}); } else v.pause();
    });
  }

  /* ---------- navigation ---------- */
  const maxStep = s => Math.max(0, ...items(s).map(el => +el.dataset.step || 0));

  function go(n, dir = n > index ? 1 : -1, toStep = 0) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === index) return;
    const prev = slides[index], next = slides[n];
    if (busy) busy.forEach(a => a.finish());
    let outAnims = [];
    if (prev) {
      outAnims = animateOut(items(prev, step), dir);
      prev.classList.add('leaving');
      Promise.all(outAnims.map(a => a.finished.catch(() => {}))).then(() => {
        if (slides[index] !== prev) { prev.classList.remove('active', 'leaving'); media(prev, false); clear(prev); }
      });
    }
    index = n; step = toStep;
    next.getAnimations().forEach(a => a.cancel());
    next.classList.remove('leaving'); next.classList.add('active');
    // when the background colour changes, wipe the new slide in instead of snapping
    if (prev && getComputedStyle(prev).backgroundColor !== getComputedStyle(next).backgroundColor) {
      const from = dir > 0 ? 'inset(100% 0 0 0)' : 'inset(0 0 100% 0)';
      next.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1000, delay: 140, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'backwards' });
    }
    document.body.dataset.slide = next.dataset.theme || '';
    clear(next);
    // hide not-yet-built steps
    items(next).forEach(el => { if ((+el.dataset.step || 0) > step) el.animate([{ opacity: 0 }], { fill: 'forwards', duration: 0 }); });
    const inAnims = animateIn(items(next, step).filter(el => (+el.dataset.step || 0) <= step), dir, prev ? 260 : 120);
    busy = inAnims;
    media(next, true);
    // restart looping CSS motion (site scroll, drifting print columns) from the top on every visit
    next.getAnimations({ subtree: true }).forEach(an => { if (typeof CSSAnimation !== 'undefined' && an instanceof CSSAnimation) an.currentTime = 0; });
    try { history.replaceState(null, '', '#' + (n + 1)); } catch {}   // not allowed in some hosted frames
    const pre = slides[0].hasAttribute('data-preshow') ? 1 : 0;   // a blank pre-show screen doesn't count
    if (progress) progress.style.transform = `scaleX(${Math.max(0, n + 1 - pre) / (slides.length - pre)})`;
    next.dispatchEvent(new CustomEvent('enter', { detail: { dir } }));
    changed();
  }
  const changed = () => document.dispatchEvent(new CustomEvent('deckchange', { detail: { index, step, count: slides.length } }));

  function next() {
    const s = slides[index];
    if (step < maxStep(s)) {
      step++;
      animateIn(items(s).filter(el => (+el.dataset.step || 0) === step), 1, 0);
      changed();
      return;
    }
    go(index + 1, 1);
  }
  function prev() {
    if (index === 0) return;
    go(index - 1, -1, maxStep(slides[index - 1]));
  }

  /* ---------- overview grid ---------- */
  function toggleGrid() { document.body.classList.toggle('grid'); }
  slides.forEach((s, i) => s.addEventListener('click', e => {
    if (document.body.classList.contains('grid')) { e.stopPropagation(); toggleGrid(); go(i); }
  }));

  /* ---------- input ---------- */
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^\d$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) { go(+typed - 1); typed = ''; return; }
    typed = '';
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'f' || k === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (k === 'g' || k === 'G' || k === 'Escape') { if (k !== 'Escape' || document.body.classList.contains('grid')) toggleGrid(); }
    else if (k === 'b' || k === 'B' || k === '.') toggleBlackout();
  });
  function toggleBlackout(on) { document.body.classList.toggle('blackout', on); changed(); }

  // public API for the phone remote (engine/remote-link.js) and other add-ons
  window.Deck = {
    next, prev, go: n => go(n), toggleBlackout,
    get index() { return index; }, get count() { return slides.length; },
    get blackout() { return document.body.classList.contains('blackout'); },
    slides,
  };
  document.addEventListener('click', e => {
    if (document.body.classList.contains('grid') || e.target.closest('a,button,video[controls]')) return;
    e.clientX < innerWidth * 0.25 ? prev() : next();
  });

  // hide the cursor when idle
  let idle;
  addEventListener('mousemove', () => {
    document.body.classList.remove('idle'); clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.add('idle'), 1800);
  });

  // if the window was hidden (another app or tab in front), resume the current slide's videos when it's back
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && slides[index])
      slides[index].querySelectorAll('video').forEach(v => { if (v.paused) v.play().catch(() => {}); });
  });

  addEventListener('hashchange', () => { const n = (parseInt(location.hash.slice(1)) || 1) - 1; if (n !== index) go(n); });

  /* ---------- start ---------- */
  const start = Math.max(0, (parseInt(location.hash.slice(1)) || 1) - 1);
  const begin = () => go(start, 1);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(begin));
})();
