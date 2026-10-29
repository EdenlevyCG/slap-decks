/* Transition styles for the rotating prints on the "What is SLAP?" slide.
 * Every style moves sideways while fading, on a smooth ease. The framed print and the room photos
 * use different moves. Images are decoded before anything moves, so nothing pops.
 *   RotationFX.styles[name].print(box, newImg)   RotationFX.styles[name].room(box, newImg, index)
 * Each box holds one <img>; the new image is appended, animated in, and the old one removed after. */
(function (root) {
  const OUT_EASE = 'cubic-bezier(.45,0,.55,1)';   // gentle in-out for leaving
  const IN_EASE  = 'cubic-bezier(.22,1,.36,1)';   // smooth, long landing

  function run(box, img, inKf, outKf, opts) {
    const olds = [...box.querySelectorAll('img')].filter(i => i !== img);
    box.appendChild(img);
    const d = opts.delay || 0;
    const a = img.animate(inKf, { duration: opts.inDur, delay: d + (opts.inLag || 0), easing: opts.inEase || IN_EASE, fill: 'backwards' });
    olds.forEach(o => o.animate(outKf, { duration: opts.outDur, delay: d, easing: opts.outEase || OUT_EASE, fill: 'forwards' }));
    const done = () => olds.forEach(o => o.remove());
    a.finished.then(done, done);
    return a;
  }
  const X = (px, extra = '') => `translate3d(${px}px,0,0) ${extra}`;

  const styles = {
    /* 1 · Glide: everything moves left. The print travels like a carousel: the old print slides out to the
           left exactly as far as the new one slides in from the right, on the same curve, so the two keep a
           constant gap and never overlap. The room photos follow, one after the other. */
    glide: {
      label: 'Glide',
      note: 'Everything moves left. Old and new prints travel together with a constant gap, never overlapping; rooms follow.',
      print: (box, img) => {
        const travel = (box.offsetWidth || 380) + 90;          // frame width + gap
        const ease = 'cubic-bezier(.65,0,.35,1)';
        return run(box, img,
          [{ opacity: 0, transform: X(travel) }, { opacity: 1, transform: X(0) }],
          [{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(-travel) }],
          { inDur: 1150, outDur: 1150, inEase: ease, outEase: ease });
      },
      room: (box, img, i) => run(box, img,
        [{ opacity: 0, transform: X(56) }, { opacity: 1, transform: X(0) }],
        [{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(-56) }],
        { inDur: 1000, outDur: 700, inLag: 80, delay: 220 + i * 140 }),
    },

    /* 2 · Push: the new print pushes the old one out of the frame, like turning a page.
           Rooms do a soft crossfade with a small sideways drift. */
    push: {
      label: 'Push',
      note: 'New print pushes the old one out sideways; rooms crossfade with a small drift.',
      print: (box, img) => {
        box.classList.add('clip');                 // the push happens inside the frame's own window
        const w = box.offsetWidth || 380;
        return run(box, img,
          [{ opacity: 0.2, transform: X(w) }, { opacity: 1, transform: X(0) }],
          [{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(-w * .6) }],
          { inDur: 1150, outDur: 1150, inEase: 'cubic-bezier(.65,0,.25,1)', outEase: 'cubic-bezier(.65,0,.25,1)' });
      },
      room: (box, img, i) => run(box, img,
        [{ opacity: 0, transform: X(26, 'scale(1.03)') }, { opacity: 1, transform: X(0, 'scale(1)') }],
        [{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(-18) }],
        { inDur: 1200, outDur: 900, delay: 300 + i * 160 }),
    },

    /* 3 · Drift: a slow, overlapping crossfade. The new print drifts in from the right as the old
           one drifts away, for a calm, gallery feel. Rooms slide in from the right at different speeds. */
    drift: {
      label: 'Drift',
      note: 'Slow overlapping crossfade with a gentle drift; rooms slide in at different speeds.',
      print: (box, img) => run(box, img,
        [{ opacity: 0, transform: X(50, 'scale(1.03)') }, { opacity: 1, transform: X(0, 'scale(1)') }],
        [{ opacity: 1, transform: X(0, 'scale(1)') }, { opacity: 0, transform: X(-30, 'scale(.99)') }],
        { inDur: 1400, outDur: 1100 }),
      room: (box, img, i) => run(box, img,
        [{ opacity: 0, transform: X(70) }, { opacity: 1, transform: X(0) }],
        [{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(-24) }],
        { inDur: 1100 + i * 250, outDur: 700, delay: 180 }),
    },

    /* 4 · Deal: like dealing a card. The new print slides in with a slight tilt that straightens as
           it lands; the old one leaves the other way. Rooms slide in from the left, staggered. */
    deal: {
      label: 'Deal',
      note: 'Print is dealt in with a tilt that straightens as it lands; rooms slide in from the left.',
      print: (box, img) => run(box, img,
        [{ opacity: 0, transform: X(120, 'rotate(4deg)') }, { opacity: 1, transform: X(0, 'rotate(0deg)') }],
        [{ opacity: 1, transform: X(0, 'rotate(0deg)') }, { opacity: 0, transform: X(-70, 'rotate(-3deg)') }],
        { inDur: 1100, outDur: 650, inLag: 100 }),
      room: (box, img, i) => run(box, img,
        [{ opacity: 0, transform: X(-60) }, { opacity: 1, transform: X(0) }],
        [{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(30) }],
        { inDur: 950, outDur: 500, delay: 260 + i * 200 }),
    },
  };

  function caption(cap, it, delay) {
    const b = cap.querySelector('b'), sp = cap.querySelector('span');
    cap.animate([{ opacity: 1, transform: X(0) }, { opacity: 0, transform: X(-16) }], { id: 'capfx', duration: 300, delay, easing: OUT_EASE, fill: 'forwards' })
      .finished.then(() => {
        b.textContent = it.name; sp.textContent = it.color;
        cap.animate([{ opacity: 0, transform: X(20) }, { opacity: 1, transform: X(0) }], { id: 'capfx', duration: 700, easing: IN_EASE, fill: 'forwards' });
      }, () => {});
  }

  root.RotationFX = { styles, caption };
})(typeof window !== 'undefined' ? window : globalThis);
