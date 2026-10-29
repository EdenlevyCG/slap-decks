/* Site slide: tap the desktop window → it grows to full screen and becomes the real, live slap.art,
 * inside the slide. slap.art forbids being framed, so the live page comes through the local relay
 * (engine/live-relay.js, started by the launcher). If the relay isn't running, the live site opens
 * in a new tab instead. "Back to slides" (or ⌘W in the fallback) shrinks the window back. */
(() => {
  const slide = document.querySelector('.s-site');
  if (!slide) return;
  const win = slide.querySelector('.browser.desk');
  const bar = win.querySelector('.bar');
  const view = win.querySelector('.viewport');
  const shot = win.querySelector('.scroll');
  const others = [...slide.querySelectorAll('.left, .mob, .chrome')];
  const RELAY = 'http://127.0.0.1:8790';
  const LIVE = 'https://slap.art';
  const EASE = 'cubic-bezier(.76,0,.24,1)', DUR = 950;
  let zoomed = false, busy = false, wentAway = false, relayUp = false, frame = null, gen = 0;

  // live frame + back button, created once
  const back = document.createElement('button');
  back.className = 'live-back'; back.type = 'button'; back.innerHTML = '← Back to slides';
  win.appendChild(back);

  const HOSTED = !!window.DECK_HOSTED;   // shared-link version: no local relay, link out instead
  async function checkRelay() {
    if (HOSTED) return (relayUp = false);
    try { await fetch(RELAY + '/__relay_ok', { mode: 'no-cors', cache: 'no-store' }); relayUp = true; } catch { relayUp = false; }
    return relayUp;
  }
  function ensureFrame() {
    if (frame || !relayUp) return;
    frame = document.createElement('iframe');
    frame.className = 'live-frame';
    frame.src = RELAY + '/';
    frame.setAttribute('allow', 'autoplay; fullscreen');
    view.appendChild(frame);
  }
  // warm the live page up as soon as the site slide is shown, so it's ready when tapped
  slide.addEventListener('enter', async () => { if (await checkRelay()) ensureFrame(); });
  checkRelay().then(ok => { if (ok && slide.classList.contains('active')) ensureFrame(); });

  const box = () => ({ left: win.offsetLeft, top: win.offsetTop, width: win.offsetWidth, radius: 18, bar: 52, view: view.offsetHeight });
  const FULL = { left: 0, top: 0, width: 1920, radius: 0, bar: 0, view: 1080 };
  let home = null;

  function apply(b) {
    Object.assign(win.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', borderRadius: b.radius + 'px' });
    bar.style.height = b.bar + 'px'; bar.style.opacity = b.bar ? '' : '0';
    view.style.height = b.view + 'px';
  }
  let tweens = [];
  function tween(from, to) {
    const opts = { duration: DUR, easing: EASE };
    const done = p => p.catch(() => {});
    tweens = [];
    const t = (el, kf) => { const a = el.animate(kf, opts); tweens.push(a); return done(a.finished); };
    return Promise.all([
      t(win, [{ left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', borderRadius: from.radius + 'px' },
              { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', borderRadius: to.radius + 'px' }]),
      t(bar, [{ height: from.bar + 'px', opacity: from.bar ? 1 : 0 }, { height: to.bar + 'px', opacity: to.bar ? 1 : 0 }]),
      t(view, [{ height: from.view + 'px' }, { height: to.view + 'px' }]),
    ]);
  }
  const fadeOthers = show => others.forEach((el, i) =>
    el.animate([{ opacity: show ? 0 : 1 }, { opacity: show ? 1 : 0 }], { id: 'zoomfade', duration: show ? 600 : 400, delay: show ? 300 + i * 60 : 0, easing: 'ease', fill: 'forwards' }));
  const cssAnims = () => shot.getAnimations().filter(a => a instanceof CSSAnimation);

  async function zoomIn() {
    if (zoomed || busy) return;
    busy = true; home = box();
    const g = gen;
    await checkRelay(); ensureFrame();
    if (g !== gen) return;
    // freeze the screenshot at the very top so it matches the live site's first screen
    cssAnims().forEach(a => a.pause());
    shot.animate([{ transform: getComputedStyle(shot).transform }, { transform: 'translateY(0)' }], { duration: DUR * .8, easing: EASE, fill: 'forwards' });
    win.classList.add('zooming');
    fadeOthers(false);
    await tween(home, FULL);
    if (g !== gen) return;               // the slide was left mid-zoom
    apply(FULL);
    zoomed = true; busy = false; wentAway = false;
    if (frame) {
      win.classList.add('is-live');           // crossfade screenshot → live page, show the back button
      live();
    } else if (HOSTED) {
      win.classList.add('is-shot');           // shared link: show the screenshot full screen + a real link out
      live();
    } else {
      const tab = window.open(LIVE, '_blank'); // relay not running: fall back to a new tab
      if (tab) wentAway = true;
    }
  }

  async function zoomOut() {
    if (!zoomed || busy) return;
    busy = true;
    const g = gen;
    win.classList.remove('is-live', 'is-shot');
    await new Promise(r => setTimeout(r, frame ? 250 : 0));
    if (g !== gen) return;
    await tween(FULL, home);
    if (g !== gen) return;
    win.removeAttribute('style'); bar.removeAttribute('style'); view.removeAttribute('style');
    win.classList.remove('zooming');
    shot.getAnimations().forEach(a => { if (!(a instanceof CSSAnimation)) a.cancel(); });
    cssAnims().forEach(a => { a.currentTime = 0; a.play(); });
    fadeOthers(true);
    zoomed = false; busy = false;
    live();
    window.focus();
    // reload the live page to its home screen for next time
    if (frame) frame.src = RELAY + '/';
  }

  function trigger(e) {
    e.preventDefault(); e.stopPropagation();
    if (e.currentTarget.blur) e.currentTarget.blur();
    zoomed ? zoomOut() : zoomIn();
  }
  const openLink = document.createElement('a');
  openLink.className = 'live-open'; openLink.href = LIVE; openLink.target = '_blank'; openLink.rel = 'noopener';
  openLink.textContent = 'Open slap.art in a new tab ↗';
  openLink.addEventListener('click', e => e.stopPropagation());
  win.appendChild(openLink);
  win.addEventListener('click', e => { if (zoomed && (win.classList.contains('is-live') || win.classList.contains('is-shot'))) return; trigger(e); });
  back.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); zoomOut(); });
  // (the red "slap.art Website" button is a plain link: it opens the site in a new tab)
  slide.querySelectorAll('.browser .url').forEach(a => a.addEventListener('click', trigger));

  // fallback mode: back from the new tab (⌘W) → shrink the window back into the slide
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && zoomed && wentAway) setTimeout(zoomOut, 350);
  });

  // put the window back to its slide position immediately (used when leaving the slide from live view)
  function resetInstant() {
    gen++;
    tweens.forEach(a => a.cancel()); tweens = [];
    win.classList.remove('is-live', 'is-shot', 'zooming');
    win.removeAttribute('style'); bar.removeAttribute('style'); view.removeAttribute('style');
    others.forEach(el => el.getAnimations().forEach(a => { if (a.id === 'zoomfade') a.cancel(); }));
    shot.getAnimations().forEach(a => { if (!(a instanceof CSSAnimation)) a.cancel(); });
    cssAnims().forEach(a => { a.currentTime = 0; a.play(); });
    if (frame && zoomed) frame.src = RELAY + '/';
    zoomed = false; busy = false; wentAway = false;
  }
  slide.addEventListener('enter', () => { if (zoomed || busy) resetInstant(); });

  // live view: keep the keyboard with the deck, so arrows / space / clicker still change slides.
  // Clicking inside the live site moves focus into it; hand focus straight back after each click.
  const sink = document.createElement('div');
  sink.tabIndex = -1; sink.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(sink);
  window.addEventListener('blur', () => {
    if (zoomed && frame && document.activeElement === frame) setTimeout(() => sink.focus({ preventScroll: true }), 60);
  });

  // leaving the slide from live view (keyboard, clicker or phone remote): the full-screen site exits with
  // the slide's own animation, then the window quietly returns to its place for next time
  const isCurrent = () => window.Deck ? Deck.index === Deck.slides.indexOf(slide) : slide.classList.contains('active');
  document.addEventListener('deckchange', () => {
    if (!(zoomed || busy) || isCurrent()) return;
    const g = gen;
    setTimeout(() => { if (g === gen && !isCurrent()) { resetInstant(); live(); } }, 900);
  });
  window.addEventListener('keydown', e => {
    if ((zoomed || busy) && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); zoomOut(); }
  }, true);

  const live = () => document.dispatchEvent(new CustomEvent('livechange', { detail: { live: zoomed } }));
  window.SiteZoom = {
    open: () => { if (isCurrent()) zoomIn(); },
    close: () => zoomOut(),
    get live() { return zoomed; },
  };
})();
