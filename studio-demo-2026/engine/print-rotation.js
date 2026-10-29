/* "What is SLAP?" slide: every 2 s the next framed print comes in, with two photos of that print in a room
 * (from its slap.art product page) following. Loops through 10 prints and restarts from the first one each
 * time the slide comes in. The transition style lives in engine/rotation-fx.js; pick it with
 * data-rotation="glide|push|drift|deal" on the slide. */
(() => {
  const slide = document.querySelector('.s-what');
  const dataEl = document.getElementById('rotation-data');
  if (!slide || !dataEl || !window.RotationFX) return;
  const items = JSON.parse(dataEl.textContent);
  const frame = slide.querySelector('.rot-frame');
  const rooms = [slide.querySelector('.rot-room.r1'), slide.querySelector('.rot-room.r2')];
  const cap = slide.querySelector('.rot-cap');
  const EVERY = 2000;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = () => RotationFX.styles[slide.dataset.rotation] || RotationFX.styles.glide;

  items.forEach(it => [it.frame, ...it.rooms].forEach(src => { const i = new Image(); i.src = src; }));
  const make = src => { const img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = src; return img; };

  let at = 0, timer = null, startT = null, gen = 0;

  async function show(i) {
    const g = gen, it = items[i], style = fx();
    const imgs = [make(it.frame), make(it.rooms[0]), make(it.rooms[1])];
    await Promise.all(imgs.map(im => im.decode().catch(() => {})));
    if (g !== gen) return;
    if (reduce) {
      [frame, ...rooms].forEach((box, k) => { box.replaceChildren(imgs[k]); });
      cap.querySelector('b').textContent = it.name; cap.querySelector('span').textContent = it.color;
      return;
    }
    style.print(frame, imgs[0]);
    RotationFX.caption(cap, it, 80);
    style.room(rooms[0], imgs[1], 0);
    style.room(rooms[1], imgs[2], 1);
  }

  function reset() {
    frame.classList.remove('clip');
    [frame, ...rooms].forEach((box, k) => {
      box.querySelectorAll('img').forEach(i => { i.getAnimations().forEach(a => a.cancel()); i.remove(); });
      box.appendChild(make(k === 0 ? items[0].frame : items[0].rooms[k - 1]));
    });
    cap.getAnimations().forEach(a => { if (a.id === 'capfx') a.cancel(); });   // keep the slide's own entrance fade
    cap.querySelector('b').textContent = items[0].name;
    cap.querySelector('span').textContent = items[0].color;
    at = 0;
  }
  function stop() { gen++; clearInterval(timer); clearTimeout(startT); timer = startT = null; }
  function start() {
    stop(); reset();
    startT = setTimeout(() => { timer = setInterval(() => { at = (at + 1) % items.length; show(at); }, EVERY); }, 1400);
  }

  const isCurrent = () => window.Deck ? Deck.index === Deck.slides.indexOf(slide) : slide.classList.contains('active');
  slide.addEventListener('enter', start);
  document.addEventListener('deckchange', () => { if (!isCurrent()) stop(); });
  if (isCurrent()) start();
})();
