/* Plume transition — a black screen with nothing on it but the air moving in
   front of someone speaking. Used between the two worlds: he says his piece
   over the dark, then the next page loads.

   Lifted from the choice scene's breath system and cut down to what a bare
   transition needs: no hands, no dust, no HUD. One call:

       plumeTransition('/audio/backtoblue.mp3', '/bluepill/');

   The audio drives the plume through an AnalyserNode, so the vapour tracks
   what is actually being said rather than a synthetic envelope.

   It can also ride audio someone else is already playing — the choice scene
   speaks his answer on its own element, and a second MediaElementSource on
   the same element would throw. Hand over that analyser instead, and it
   renders without owning the audio or moving the page:

       plumeTransition(null, null, { analyser: tap, fadeIn: 600 });
       ... later: handle.leave(); */
(function (global) {
  'use strict';

  /* Warm the shared context on the first gesture anywhere on the page, well
     before a transition needs it.

     A context created at the moment of the click is not usable at the moment
     of the click: it reports 'suspended' for a tick or two while it starts,
     on desktop as much as on a phone. Reading that state and deciding from it
     is what stopped the plume tracking the voice. Warmed on an earlier
     gesture, it is genuinely running by the time anyone reaches a transition,
     and the analyser can be trusted again. */
  function warm() {
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return;
      if (!global._audioCtx) global._audioCtx = new AC();
      var c = global._audioCtx;
      if (c.state === 'suspended') c.resume();
      if (!c._unlocked) {
        c._unlocked = true;
        var s = c.createBufferSource();
        s.buffer = c.createBuffer(1, 1, 22050);
        s.connect(c.destination);
        s.start(0);
      }
    } catch (e) {}
  }
  var GESTURES = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];
  for (var gi = 0; gi < GESTURES.length; gi++) {
    document.addEventListener(GESTURES[gi], warm, { capture: true, passive: true });
  }

  var HEAD_X = 0.507;          /* he is not dead centre */
  var PLUME_TILT = 0.055;      /* nor square to the camera */
  var CAP = 130;

  /* Speech comes from the mouth: one wide, turbulent stream. */
  var MOUTH = { spread: 0.026, out: 0.35, down: 1.0, r0: 9, grow: 1.15, wander: 1.7 };
  /* Between phrases he breathes, and never as a matched pair. */
  var NOSTRIL = [
    { dx: -0.0165, out: -0.55, down: 0.80, r0: 7.2, grow: 0.88, wander: 0.95, rate: 1.00, a: 1.4 },
    { dx:  0.0205, out:  1.18, down: 0.64, r0: 9.4, grow: 1.06, wander: 1.45, rate: 0.68, a: 1.4 }
  ];

  function softSprite() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(214,222,232,0.55)');
    gr.addColorStop(0.35, 'rgba(198,208,220,0.20)');
    gr.addColorStop(1, 'rgba(190,200,214,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }

  global.plumeTransition = function (audioUrl, nextUrl, opts) {
    opts = opts || {};
    var borrowed = !!opts.analyser;
    var fadeIn = opts.fadeIn || 500;
    var root = document.createElement('div');
    root.className = 'plume-transition';
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#050505;' +
      'opacity:0;transition:opacity ' + (fadeIn / 1000) + 's ease;pointer-events:none;';
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen;';
    root.appendChild(cv);
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.style.opacity = '1'; });

    var ctx = cv.getContext('2d');
    var sprite = softSprite();
    var plume = [];
    var head = { x: 0, y: 0, sm: 0, t: 0, gx: 0, gy: 0, next: 0 };
    var lean = 0.34;
    var W = 0, H = 0;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);

    /* ── audio ── */
    var el = null;
    var analyser = null, data = null;
    if (borrowed) {
      analyser = opts.analyser;
      data = new Uint8Array(analyser.fftSize);
    }
    if (!borrowed) {
    el = new Audio();
    el.preload = 'auto';
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.src = (opts.blobFor && opts.blobFor[audioUrl]) || audioUrl;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        warm();
        var actx = global._audioCtx;
        /* Putting the element through the graph makes the graph the only way
           out of it. On a phone the context is usually still suspended at this
           point — resume() only settles a tick later — and routing into a
           suspended graph doesn't delay the audio, it silences it outright
           while the element plays on and reports that it ended. That is how
           you get a black screen, no voice, and then the next page.

           So the analyser is a luxury and being heard is not: unless the
           context is already running, leave the element alone and let it play
           itself. The plume falls back to breathing on its own below. */
        if (actx.state === 'running') {
          var src = actx.createMediaElementSource(el);
          analyser = actx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.55;
          src.connect(analyser);
          analyser.connect(actx.destination);
          data = new Uint8Array(analyser.fftSize);
        }
      }
    } catch (e) { analyser = null; }
    }

    function level() {
      if (!analyser) return 0;
      analyser.getByteTimeDomainData(data);
      var sum = 0;
      for (var i = 0; i < data.length; i++) {
        var d = (data[i] - 128) / 128;
        sum += d * d;
      }
      return Math.min(1, Math.sqrt(sum / data.length) * 3.4);
    }

    /* ── head drift, so the source is never a fixed nozzle ── */
    function stepHead(dt, lvl, speaking) {
      head.t += dt;
      head.sm += ((speaking ? lvl : 0) - head.sm) * 0.10;
      var t = head.t;
      if (t >= head.next) {
        head.next = t + (speaking ? 0.35 + Math.random() * 1.15 : 2 + Math.random() * 3);
        head.gx = (Math.random() - 0.5) * (speaking ? 0.022 : 0.004);
        head.gy = (Math.random() - 0.5) * (speaking ? 22 : 4);
      }
      var tx = head.gx + (speaking
        ? (Math.sin(t * 0.85) * 0.010 + Math.sin(t * 1.9 + 1.1) * 0.006) * (0.4 + head.sm)
        : Math.sin(t * 0.21) * 0.0028);
      var ty = head.gy * (speaking ? 0.35 + head.sm : 0.4) + (speaking
        ? (Math.sin(t * 1.35 + 0.6) * 8 + Math.sin(t * 2.7) * 4) * head.sm
        : Math.sin(t * 0.25) * 2.2);
      head.x += (tx - head.x) * (speaking ? 0.09 : 0.05);
      head.y += (ty - head.y) * (speaking ? 0.11 : 0.06);
    }

    function puff(srcX, jitter, j, gain, lvl, y0) {
      plume.push({
        x: W * srcX + (Math.random() - 0.5) * W * jitter,
        y: y0,
        vx: j.out * (0.14 + Math.random() * 0.34) * gain
            + (Math.random() - 0.5) * 0.18 + PLUME_TILT,
        vy: (0.80 + Math.random() * 1.1) * (0.5 + lvl) * j.down,
        r: j.r0 + Math.random() * j.r0 * 1.1,
        grow: j.grow * (0.75 + Math.random() * 0.6),
        drift: j.out * 0.0038,
        curl: Math.random() * 6.283,
        wander: j.wander * (0.7 + Math.random() * 0.7),
        life: 0,
        max: 130 + Math.random() * 130,
        a: (0.030 + Math.random() * 0.045) * lvl * gain * (j.a || 1)
      });
    }

    var gate = 0, prev = 0;
    function emit(lvl, speaking) {
      if (plume.length >= CAP) return;
      if (lvl < (speaking ? 0.17 : 0.04)) return;
      gate += lvl;
      if (gate < (speaking ? 0.3 : 0.22)) return;
      gate = 0;
      if (speaking) {
        var plosive = lvl - prev > 0.22;
        var n = plosive ? 4 : Math.max(1, Math.round(lvl * 3.2));
        if (!plosive && lvl < 0.32 && Math.random() < 0.45) return;
        for (var m = 0; m < n; m++) {
          puff(HEAD_X + head.x + 0.002, MOUTH.spread * (plosive ? 2.1 : 1),
            { out: (Math.random() - 0.5) * 2 * MOUTH.out * (plosive ? 2.4 : 1),
              down: MOUTH.down * (plosive ? 1.5 : 1), r0: MOUTH.r0,
              grow: MOUTH.grow * (plosive ? 1.4 : 1),
              wander: MOUTH.wander * (plosive ? 1.6 : 1) },
            1, lvl, -8 + head.y);
        }
        return;
      }
      for (var i = 0; i < 2; i++) {
        var j = NOSTRIL[i];
        var gain = (i === 0 ? 1 - lean * 0.55 : 1 + lean * 0.55) * j.rate;
        if (gain <= 0.05 || Math.random() > gain * 0.85) continue;
        puff(HEAD_X + head.x + j.dx, 0.007, j, gain, lvl, -14 + head.y);
      }
    }

    var last = -1, done = false;
    function frame(now) {
      if (done) return;
      requestAnimationFrame(frame);
      var dt = last < 0 ? 0.016 : Math.min(0.1, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);

      var lvl = level();
      var speaking = lvl > 0.025;
      /* with no analyser at all, keep a slow breath going rather than nothing */
      if (!analyser) lvl = 0.35 * Math.max(0, Math.sin(now / 1400));
      stepHead(dt, lvl, speaking);
      emit(lvl, speaking);
      prev = lvl;

      for (var i = plume.length - 1; i >= 0; i--) {
        var q = plume[i];
        q.life++;
        if (q.life > q.max) { plume.splice(i, 1); continue; }
        q.vx += Math.sin(q.life * 0.055 + q.curl) * q.wander * 0.013;
        q.x += q.vx; q.y += q.vy;
        q.vy *= 0.992;
        q.vx = q.vx * 0.994 + q.drift;
        q.r += q.grow;
        var lp = q.life / q.max;
        var a = q.a * (lp < 0.18 ? lp / 0.18 : 1 - (lp - 0.18) / 0.82);
        if (a <= 0.0008) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);

    function leave() {
      if (done) return;
      done = true;
      root.style.opacity = '0';
      setTimeout(function () {
        if (nextUrl) global.location.href = nextUrl;
        else root.remove();
      }, 480);
    }

    if (!borrowed) {
      el.addEventListener('ended', leave);
      el.addEventListener('error', function () { setTimeout(leave, 1200); });
      var p = el.play();
      if (p && p.catch) p.catch(function () { setTimeout(leave, 1400); });
      /* never strand anyone on a black screen */
      setTimeout(leave, 30000);
    } else {
      /* the caller owns the audio and says when this ends, but not forever */
      setTimeout(leave, opts.maxMs || 30000);
    }

    return { leave: leave };
  };
})(window);
