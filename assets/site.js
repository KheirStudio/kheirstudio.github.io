(function(){
  window.KS = 1; /* tells the failsafe in each page's head that this script arrived */
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vh = innerHeight;

  function clamp(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
  function all(sel, el){ return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* hero lines rise once the fonts are in */
  /* the dot takes over from the headline's full stop only once the headline has finished rising */
  function ready(){
    if (root.classList.contains('is-ready')) return;
    root.classList.add('is-ready');
    setTimeout(function(){ dotStart(); }, 1600);
  }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function(r){ setTimeout(r, 1200); })]).then(ready);
  } else { ready(); }

  /* never leave content hidden when the page is not being painted (link previews, screenshot tools, embedded panes) */
  setTimeout(function(){
    var t = document.timeline ? document.timeline.currentTime : 1000;
    if (document.visibilityState === 'visible' && (!t || t < 50)) root.classList.add('no-anim');
  }, 2600);

  /* reveal on scroll (a browser without IntersectionObserver just shows everything) */
  var hasIO = 'IntersectionObserver' in window;
  if (hasIO) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .01 });
    all('[data-reveal]').forEach(function(el){ io.observe(el); });
  } else {
    all('[data-reveal]').forEach(function(el){ el.classList.add('is-in'); });
  }

  /* London clock: changes exactly on the minute, and at once when the page comes back into view
     (background tabs slow their timers, and a page restored with Back keeps its old time) */
  var clocks = all('[data-clock]');
  if (clocks.length) {
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/London' });
    var clockTimer = 0;
    var tick = function(){
      var now = new Date(), t = fmt.format(now);
      clocks.forEach(function(c){ if (c.textContent !== t) { c.textContent = t; c.setAttribute('datetime', now.toISOString()); } });
      clearTimeout(clockTimer);
      clockTimer = setTimeout(tick, 60000 - now.getTime() % 60000 + 30);
    };
    tick();
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) tick(); });
    addEventListener('pageshow', tick);
    addEventListener('focus', tick);
  }

  /* the logo's dot in the header. The nav blends with the page (one colour over paper or the dark band),
     so a true accent dot is laid over the logo's own, and turns the night accent over a dark band. */
  var kdot = document.querySelector('.nav .k-dot'), navEl = document.getElementById('nav'), navDot = null, nights = all('.night');
  function placeNavDot(){
    var r = kdot.getBoundingClientRect(), n = navEl.getBoundingClientRect();
    navDot.style.left = r.left + 'px'; navDot.style.top = (r.top - n.top) + 'px';
    navDot.style.width = r.width + 'px'; navDot.style.height = r.height + 'px';
  }
  function shadeNavDot(){
    var y = parseFloat(navDot.style.top) + parseFloat(navDot.style.height) / 2, dark = false;
    for (var i = 0; i < nights.length; i++) { var b = nights[i].getBoundingClientRect(); if (b.top <= y && b.bottom >= y) dark = true; }
    navDot.classList.toggle('on-dark', dark);
  }
  if (kdot && navEl) {
    navDot = document.createElement('span');
    navDot.className = 'nav-dot'; navDot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(navDot);
    root.classList.add('has-nav-dot');
    placeNavDot(); shadeNavDot();
    addEventListener('resize', function(){ placeNavDot(); shadeNavDot(); });
    addEventListener('scroll', shadeNavDot, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeNavDot);
  }

  /* menu on phones. Without JavaScript the button is a link to the footer links. */
  var menuBtn = document.querySelector('.nav-menu'), menu = document.getElementById('menu');
  var shut = all('main, footer');
  function setMenu(open){
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('menu-open', open);
    shut.forEach(function(el){ el.inert = open; });
    if (open) {
      menu.hidden = false;
      void menu.offsetWidth;
      menu.classList.add('is-open');
      var first = menu.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
    }
  }
  if (menuBtn && menu) {
    menuBtn.setAttribute('role', 'button');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.addEventListener('click', function(e){ e.preventDefault(); setMenu(menu.hidden); });
    menuBtn.addEventListener('keydown', function(e){ if (e.key === ' ') { e.preventDefault(); setMenu(menu.hidden); } });
    addEventListener('keydown', function(e){ if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
    all('a', menu).forEach(function(a){ a.addEventListener('click', function(){ if (a.hash && a.pathname === location.pathname) setMenu(false); }); });
    var wide = matchMedia('(min-width: 761px)'), onWide = function(m){ if (m.matches && !menu.hidden) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
  }

  /* contact form */
  var form = document.getElementById('contact-form');
  if (form) (function(){
    /* Posts to our own Supabase edge function, which relays the message to our inbox
       through Resend. The destination address lives server-side. The anon key is publishable. */
    var ENDPOINT = 'https://bfzckjrctwlllpohgtqn.supabase.co/functions/v1/contact-form';
    var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmemNranJjdHdsbGxwb2hndHFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzQyNTUsImV4cCI6MjA5MDMxMDI1NX0.cmPuOca1kSPt48aBZuK-6yjpRTdvW4BaKt0vap03NNg';
    var f = form.elements, name = f.namedItem('name'), email = f.namedItem('email'), msg = f.namedItem('message');
    var handle = f.namedItem('handle');
    var status = document.getElementById('form-status'), send = document.getElementById('send'), sent = document.getElementById('sent');

    function mark(field, text){
      var e = document.getElementById(field.id + '-e');
      field.setAttribute('aria-invalid', text ? 'true' : 'false');
      if (e) e.textContent = text || '';
      return !text;
    }
    [name, email, msg].forEach(function(el){
      el.addEventListener('input', function(){ if (el.getAttribute('aria-invalid') === 'true') mark(el, ''); });
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var v = { name: name.value.trim(), email: email.value.trim(), message: msg.value.trim() };
      var ok = [
        mark(name, v.name ? '' : 'Please add your name.'),
        mark(email, !v.email ? 'Please add your email, so we can reply.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ? '' : 'That email address looks incomplete.'),
        mark(msg, v.message ? '' : 'Please add a few lines about what you have in mind.')
      ];
      if (ok.indexOf(false) > -1) {
        status.className = 'form-note';
        status.textContent = '';
        [name, email, msg][ok.indexOf(false)].focus();
        return;
      }
      if (f.namedItem('_gotcha').value) return; /* honeypot: only bots fill it */

      /* the endpoint takes name, email, subject and message only, so the website or handle leads the message */
      var tag = handle.value.trim() ? '[' + handle.value.trim() + '] ' : '';
      send.disabled = true;
      send.firstChild.nodeValue = 'Sending';
      send.lastElementChild.hidden = true;
      status.className = 'form-note';
      status.textContent = '';
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function(){ if (ctl) ctl.abort(); }, 15000);

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
        body: JSON.stringify({
          name: v.name,
          email: v.email,
          subject: 'K Studio website',
          message: tag + v.message
        }),
        signal: ctl ? ctl.signal : undefined
      }).then(function(r){
        clearTimeout(timer);
        if (!r.ok) throw new Error('send failed');
        form.reset();
        form.hidden = true;
        sent.hidden = false;
        sent.focus();
      }).catch(function(){
        clearTimeout(timer);
        status.className = 'form-note form-err';
        status.textContent = 'That did not send. Please try again in a minute.';
        send.disabled = false;
        send.firstChild.nodeValue = 'Send ';
        send.lastElementChild.hidden = false;
      });
    });
  })();

  /* statement: split into words */
  var st = document.querySelector('[data-words]'), words = [], lastP = -1;
  if (st) (function split(node){
    Array.prototype.slice.call(node.childNodes).forEach(function(n){
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        /* split on ordinary spaces only, so a non-breaking space keeps two words together */
        n.textContent.split(/([ \t\r\n]+)/).forEach(function(part){
          if (!part) return;
          if (/^[ \t\r\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var s = document.createElement('span'); s.className = 'w'; s.textContent = part;
          frag.appendChild(s); words.push(s);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) { split(n); }
    });
  })(st);

  /* before / after */
  all('.ba').forEach(function(ba){
    var input = ba.querySelector('input');
    function set(v){ ba.style.setProperty('--pos', v + '%'); }
    input.addEventListener('input', function(){ set(input.value); });
    if (!hasIO) return;
    new IntersectionObserver(function(es, o){
      if (!es[0].isIntersecting) return;
      o.disconnect();
      if (reduce) return;
      var t0 = performance.now();
      (function step(now){
        var k = clamp((now - t0) / 1600), v = 90 - 40 * ease(k);
        set(v); input.value = v;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: .5 }).observe(ba);
  });

  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* magnetic button */
  if (!reduce && fine) {
    all('[data-magnetic]').forEach(function(b){
      b.addEventListener('pointermove', function(e){
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width/2) * .25) + 'px,' + ((e.clientY - r.top - r.height/2) * .35) + 'px)';
      });
      b.addEventListener('pointerleave', function(){ b.style.transform = ''; });
    });
  }

  if (reduce) return;

  /* the dot: one accent dot that travels from full stop to section marker to full stop */
  var dot = document.querySelector('.dot');
  var anchors = all('.dot-anchor');
  var COL = { accent: [75, 87, 245], live: [23, 165, 103], night: [138, 148, 255] };
  var g = 0, dotOn = false, snap = false;
  function dotStart(){
    if (reduce || dotOn || !dot || !anchors.length) return;
    root.classList.add('js-dot'); dotOn = true; snap = true;
  }

  /* on phones the dot keeps to the left gutter so it never crosses text */
  var narrow = matchMedia('(max-width: 860px)'), gutter = 10;
  function measure(){
    vh = innerHeight;
    var w = document.querySelector('main .wrap');
    if (w) gutter = w.getBoundingClientRect().left + parseFloat(getComputedStyle(w).paddingLeft) / 2;
  }
  measure();
  addEventListener('resize', measure);

  /* a full stop is reached from the clear lane above its line of text and left by the lane below;
     section markers sit at the left edge, so the dot reaches them straight from the gutter */
  function point(a){
    var q = a.getBoundingClientRect(), h = !a.classList.contains('dot-anchor--sm') && a.closest('h1, h2, p');
    var r = h && h.getBoundingClientRect(), gap = h ? Math.max(14, parseFloat(getComputedStyle(h).fontSize) * .32) : 0;
    return { x: q.left + q.width / 2, y: q.top + q.height / 2, s: q.width, c: COL[a.dataset.c] || COL.accent,
      above: r ? r.top - gap : null, below: r ? r.bottom + gap : null };
  }
  function route(P, Q){
    var w = [[P.x, P.y]];
    if (P.below !== null) w.push([P.x, P.below], [gutter, P.below]); else w.push([gutter, P.y]);
    if (Q.above !== null) w.push([gutter, Q.above], [Q.x, Q.above]); else w.push([gutter, Q.y]);
    w.push([Q.x, Q.y]);
    return w;
  }
  function along(w, t){
    var len = [], total = 0, i, d;
    for (i = 1; i < w.length; i++) { d = Math.hypot(w[i][0] - w[i-1][0], w[i][1] - w[i-1][1]); len.push(d); total += d; }
    d = t * total;
    for (i = 0; i < len.length; i++) {
      if (d <= len[i] || i === len.length - 1) {
        var k = len[i] ? clamp(d / len[i]) : 1;
        return [lerp(w[i][0], w[i+1][0], k), lerp(w[i][1], w[i+1][1], k)];
      }
      d -= len[i];
    }
  }

  function drawDot(){
    var y = scrollY, pts = anchors.map(point), m = pts.length, P, Q, t, size, x, yy, c;
    if (m === 1) {
      P = Q = pts[0]; t = 0; size = P.s; x = P.x; yy = P.y;
    } else {
      var focus = vh * .5, hold = vh * .2, target = m - 1;
      var remaining = (root.scrollHeight - vh) - y;
      for (var s = 0; s < m - 1; s++) {
        var A = pts[s], B = pts[s + 1], start = A.y + hold, end = B.y - hold;
        if (s === m - 2) {
          var over = (B.y - remaining - hold) - focus;
          if (over > 0) end -= over + 1;
        }
        if (end <= start) { var mid = (start + end) / 2; start = mid - 1; end = mid + 1; }
        if (focus < start) { target = s; break; }
        if (focus < end) { target = s + (focus - start) / (end - start); break; }
      }
      if (snap) { g = target; snap = false; }
      g += (target - g) * .14;
      if (Math.abs(target - g) < .0004) g = target;
      var a0 = Math.min(m - 2, Math.floor(g));
      t = ease(g - a0); P = pts[a0]; Q = pts[a0 + 1];
      size = lerp(P.s, Q.s, t);
      if (narrow.matches && t > 0 && t < 1) { var at = along(route(P, Q), t); x = at[0]; yy = at[1]; }
      else { x = lerp(P.x, Q.x, t); yy = lerp(P.y, Q.y, t); }
    }
    c = [0, 1, 2].map(function(i){ return Math.round(lerp(P.c[i], Q.c[i], t)); });
    dot.style.width = dot.style.height = size.toFixed(2) + 'px';
    dot.style.transform = 'translate3d(' + (x - size / 2).toFixed(2) + 'px,' + (yy - size / 2).toFixed(2) + 'px,0)';
    dot.style.background = 'rgb(' + c.join(',') + ')';
  }

  /* arriving through a page transition: headline already in place, dot already on its full stop */
  addEventListener('pagereveal', function(e){
    if (!e.viewTransition) return;
    root.classList.add('vt-in');
    ready(); dotStart(); measure(); drawDot();
  });

  /* cursor label over product media, fine pointers only */
  var cur = null, cx = -200, cy = -200, tx = -200, ty = -200, cs = .6, cOn = false;
  var targets = all('[data-cursor]');
  if (fine && targets.length) {
    cur = document.createElement('div');
    cur.className = 'cursor mono'; cur.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cur);
    addEventListener('pointermove', function(e){ tx = e.clientX; ty = e.clientY; }, { passive: true });
    targets.forEach(function(el){
      el.addEventListener('pointerenter', function(e){
        cur.textContent = el.dataset.cursor; cOn = true; cur.classList.add('is-on');
        if (cx < -100) { cx = tx = e.clientX; cy = ty = e.clientY; }
      });
      el.addEventListener('pointerleave', function(){ cOn = false; cur.classList.remove('is-on'); });
    });
  }

  var parallax = all('[data-parallax]');
  var nav = document.getElementById('nav'), lastY = scrollY;

  function frame(){
    var y = scrollY;

    /* nav hides going down, returns going up */
    if (nav && Math.abs(y - lastY) > 6) {
      var hide = y > lastY && y > 240 && !root.classList.contains('menu-open');
      nav.classList.toggle('is-hidden', hide);
      if (navDot) navDot.classList.toggle('is-hidden', hide);
      lastY = y;
    }

    /* words light up as the paragraph passes */
    if (st) {
      var r = st.getBoundingClientRect();
      var p = clamp((vh * .84 - r.top) / (r.height + vh * .28));
      if (p !== lastP) {
        lastP = p;
        for (var i = 0, n = words.length; i < n; i++) words[i].style.opacity = (.16 + .84 * clamp(p * n - i)).toFixed(3);
      }
    }

    /* phones drift */
    for (var j = 0; j < parallax.length; j++) {
      var el = parallax[j], b = el.parentNode.getBoundingClientRect();
      var k = ((b.top + b.height / 2) - vh / 2) / vh;
      el.style.transform = 'translate3d(0,' + (k * parseFloat(el.dataset.parallax)).toFixed(1) + 'px,0)';
    }

    if (dotOn) drawDot();

    if (cur) {
      cx += (tx - cx) * .22; cy += (ty - cy) * .22; cs += ((cOn ? 1 : .6) - cs) * .2;
      cur.style.transform = 'translate3d(' + (cx + 16).toFixed(1) + 'px,' + (cy + 16).toFixed(1) + 'px,0) scale(' + cs.toFixed(3) + ')';
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
