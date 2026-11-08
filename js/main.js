/* ==========================================================================
   Sweet Nails Aix — animations et interactions
   GSAP + ScrollTrigger + Lenis (fichiers locaux dans js/vendor, aucun service externe)
   Site 100 % statique : la réservation renvoie vers l'agenda RDV360 du salon.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Réglages à compléter ---------- */
  const CONFIG = {
    // Aucun numéro public trouvé (Google Maps, RDV360, Instagram, TikTok).
    // Renseigner ici pour faire apparaître les boutons « Appeler » partout.
    phone: '',        // ex. '+33612345678'
    phoneLabel: ''    // ex. '06 12 34 56 78'
  };

  // Horaires de l'agenda en ligne, en minutes depuis minuit (0 = dimanche)
  const HOURS = {
    0: null,
    1: [10 * 60, 19 * 60 + 20],
    2: [10 * 60, 19 * 60 + 20],
    3: [10 * 60, 19 * 60 + 20],
    4: [10 * 60, 19 * 60 + 20],
    5: [9 * 60, 14 * 60],
    6: null
  };

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = () => innerWidth > 900;

  /* ---------- Fonctions sans animation (toujours actives) ---------- */

  function initPhone() {
    if (!CONFIG.phone) return;
    const tel = 'tel:' + CONFIG.phone.replace(/[^\d+]/g, '');
    $$('.js-phone').forEach(a => {
      a.href = tel;
      a.hidden = false;
      $('span', a).textContent = CONFIG.phoneLabel || CONFIG.phone;
    });
    const fab = $('#fab');
    fab.href = tel;
    fab.removeAttribute('target');
    fab.removeAttribute('rel');
    $('#fabText').textContent = 'Appeler';
  }

  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris', weekday: 'long', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return { day: days.indexOf(get('weekday')), min: (+get('hour')) * 60 + (+get('minute')) };
  }

  function initOpenStatus() {
    const el = $('#openStatus');
    if (!el) return;
    const { day, min } = parisNow();
    $$('#hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.d === day));
    const fmt = m => {
      const h = Math.floor(m / 60), mm = m % 60;
      return mm ? `${h}h${String(mm).padStart(2, '0')}` : `${h}h`;
    };
    const today = HOURS[day];
    let msg, cls;
    if (today && min >= today[0] && min < today[1]) {
      msg = `Ouvert · jusqu'à ${fmt(today[1])}`;
      cls = 'is-open';
    } else {
      let next = null;
      if (today && min < today[0]) next = { d: 0, t: today[0] };
      else for (let i = 1; i <= 7 && !next; i++) {
        const d = (day + i) % 7;
        if (HOURS[d]) next = { d: i, t: HOURS[d][0] };
      }
      const names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const when = next.d === 0 ? "aujourd'hui" : next.d === 1 ? 'demain' : names[(day + next.d) % 7];
      msg = `Fermé · ouvre ${when} à ${fmt(next.t)}`;
      cls = 'is-closed';
    }
    el.classList.add(cls);
    $('span', el).textContent = msg;
  }

  /* Ticket de séance : somme des prix et des durées */
  function initSeance(animate) {
    const inputs = $$('#opts input');
    if (!inputs.length) return;
    const lines = $('#ticketLines'), empty = $('#ticketEmpty');
    const sumTime = $('#sumTime'), sumPrice = $('#sumPrice');
    const state = { price: 0, min: 0 };
    let known = new Set();

    const fmtTime = m => {
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60), r = m % 60;
      return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
    };
    const paint = () => {
      sumPrice.textContent = Math.round(state.price);
      sumTime.textContent = fmtTime(Math.round(state.min));
    };

    function render() {
      const on = inputs.filter(i => i.checked);
      const names = new Set(on.map(i => i.dataset.name));
      lines.textContent = '';
      on.forEach(i => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        const dots = document.createElement('i');
        const price = document.createElement('b');
        name.textContent = i.dataset.name;
        price.textContent = `${i.dataset.price} €`;
        li.append(name, dots, price);
        lines.append(li);
        if (animate && !known.has(i.dataset.name)) gsap.from(li, { x: -24, autoAlpha: 0, duration: .6, ease: 'power3.out' });
      });
      known = names;
      empty.hidden = on.length > 0;
      const price = on.reduce((s, i) => s + +i.dataset.price, 0);
      const min = on.reduce((s, i) => s + +i.dataset.min, 0);
      if (animate) {
        gsap.to(state, { price, min, duration: .8, ease: 'power3.out', onUpdate: paint, overwrite: true });
      } else {
        state.price = price; state.min = min; paint();
      }
    }
    inputs.forEach(i => i.addEventListener('change', render));
    // premier rendu sans animation
    const a = animate; animate = false; render(); animate = a;
  }

  function initFaq() {
    const items = $$('.qa');
    items.forEach(qa => {
      const btn = $('button', qa);
      btn.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        items.forEach(o => {
          o.classList.toggle('is-open', o === qa && open);
          $('button', o).setAttribute('aria-expanded', String(o === qa && open));
        });
        setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 700);
      });
    });
  }

  function initLightbox(onOpen, onClose) {
    const dlg = $('#lightbox');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    const img = $('#lbImg'), cap = $('#lbCap');
    let opener = null;
    $$('.gal__btn').forEach(btn => btn.addEventListener('click', () => {
      opener = btn;
      img.src = btn.dataset.full;
      img.alt = $('img', btn).alt;
      cap.textContent = btn.dataset.cap || '';
      dlg.showModal();
      onOpen && onOpen();
    }));
    $('#lbClose').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { onClose && onClose(); opener && opener.focus(); });
  }

  /* Économie de données : pas de vidéo, l'image de secours suffit */
  const saveData = navigator.connection && navigator.connection.saveData;
  if (saveData) {
    const v = $('#heroVideo');
    if (v) { v.removeAttribute('autoplay'); v.preload = 'none'; v.pause(); v.innerHTML = ''; v.load(); }
  }

  /* ---------- Mode « mouvement réduit » ou bibliothèques absentes ---------- */
  if (reduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    root.classList.add('rm');
    root.classList.remove('is-loading');
    const ld = $('#loader'); if (ld) ld.remove();
    const v = $('#heroVideo'); if (v) { v.removeAttribute('autoplay'); v.pause(); }
    initPhone(); initOpenStatus(); initFaq(); initLightbox(); initNavBasic();
    if (typeof gsap !== 'undefined') initSeance(false);
    initReviews(false);
    return;
  }

  /* Navigation sans animation (mouvement réduit) : barre pleine au scroll, menu mobile, bouton flottant */
  function initNavBasic() {
    const nav = $('#nav'), burger = $('#burger'), menu = $('#menu'), fab = $('#fab');
    const onScroll = () => {
      nav.classList.toggle('is-solid', scrollY > 60);
      fab.style.transform = scrollY > innerHeight * .7 ? 'none' : '';
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const set = open => {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', String(!open));
      nav.classList.toggle('menu-open', open);
      menu.style.visibility = open ? 'visible' : 'hidden';
      menu.style.clipPath = open ? 'none' : '';
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
    $$('.menu a').forEach(a => a.addEventListener('click', () => set(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis) ---------- */
  const lenis = new Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  window.__lenis = lenis;

  /* ---------- Découpage de texte (mots / lettres) ---------- */
  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span');
          const wi = document.createElement('span');
          w.className = 'w'; w.setAttribute('aria-hidden', 'true');
          wi.className = 'wi'; wi.textContent = part;
          w.append(wi); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
    return $$('.wi', el);
  }

  function splitChars(el) {
    const out = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach(c => {
          if (c === ' ') { frag.append(' '); return; }
          const s = document.createElement('span');
          s.className = 'ch'; s.textContent = c;
          frag.append(s); out.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
    return out;
  }

  /* ==========================================================================
     Préchargeur, puis ouverture de l'arche vers le hero
     ========================================================================== */
  const heroChars = $$('.hero__title [data-chars]').flatMap(splitChars);
  const footChars = $$('#footGiant [data-chars]').flatMap(splitChars);

  function runLoader() {
    return new Promise(resolve => {
      const arch = $('#loaderArch'), numEl = $('#loaderNum');
      const state = { n: 0 };
      const render = () => { numEl.textContent = Math.round(state.n); };

      let assetsReady = false;
      const video = $('#heroVideo');
      Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })),
        new Promise(r => {
          if (!video || video.readyState >= 3) return r();
          video.addEventListener('canplay', r, { once: true });
          setTimeout(r, 3500);
        })
      ]).then(() => { assetsReady = true; });
      setTimeout(() => { assetsReady = true; }, 5500);

      gsap.set(arch, { '--draw': '100%' });
      gsap.to(arch, { '--draw': '0%', duration: 1.7, ease: 'power3.inOut' });
      gsap.from('.loader__sprig', { scaleY: 0, autoAlpha: 0, duration: 1.5, ease: 'power3.out', delay: .2 });
      gsap.from('.loader__name span, .loader__name em', { yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: .12, delay: .15 });
      gsap.from('.loader__sub', { autoAlpha: 0, y: 12, duration: .8, delay: .5 });

      const minTime = 2000;
      gsap.to(state, { n: 90, duration: minTime / 1000, ease: 'power2.out', onUpdate: render });
      const waitAssets = () => new Promise(r => { const t = () => assetsReady ? r() : requestAnimationFrame(t); t(); });
      Promise.all([waitAssets(), new Promise(r => setTimeout(r, minTime))]).then(() => {
        gsap.to(state, { n: 100, duration: .5, ease: 'power2.out', onUpdate: render, onComplete: () => setTimeout(resolve, 150) });
      });
    });
  }

  function runIntro() {
    const media = $('#heroMedia'), video = $('#heroVideo'), loader = $('#loader'), nav = $('#nav');
    const aw = Math.min(innerWidth * .62, 300), ah = Math.min(innerHeight * .46, 400);
    const top = (innerHeight - ah) / 2, left = (innerWidth - aw) / 2;
    const startClip = `inset(${top}px ${left}px ${top}px ${left}px round ${aw}px ${aw}px 0px 0px)`;
    const endClip = 'inset(0px 0px 0px 0px round 0px 0px 0px 0px)';

    gsap.set(heroChars, { yPercent: 118 });
    gsap.set(['.hero__eyebrow', '.hero__lead', '.hero__cta .btn'], { autoAlpha: 0, y: 30 });
    gsap.set('#heroBadge', { scale: 0, rotation: -40, autoAlpha: 0 });
    gsap.set(['.hero__hours', '.hero__scroll', '#heroLayer'], { autoAlpha: 0 });
    gsap.set(nav, { yPercent: -120 });
    media.style.clipPath = startClip;
    root.classList.remove('is-loading');

    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        lenis.start();
        initHeroScroll();
        ScrollTrigger.refresh();
      }
    });
    tl.to(loader, { autoAlpha: 0, duration: .7, ease: 'power2.inOut' })
      .to(media, { clipPath: endClip, duration: 1.7, ease: 'power4.inOut' }, '-=.35')
      .fromTo(video, { scale: 1.4 }, { scale: 1, duration: 2.4, ease: 'power3.out' }, '<')
      .to(nav, { yPercent: 0, duration: 1.1, ease: 'power3.out' }, '-=1.0')
      .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: .9, ease: 'power3.out' }, '-=1.1')
      .to(heroChars, { yPercent: 0, duration: 1.4, ease: 'power4.out', stagger: .055 }, '-=1.0')
      .to(['.hero__lead', '.hero__cta .btn'], { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .12 }, '-=1.0')
      .to('#heroBadge', { scale: 1, rotation: 0, autoAlpha: 1, duration: 1.2, ease: 'back.out(1.6)' }, '-=.9')
      .to(['.hero__hours', '.hero__scroll', '#heroLayer'], { autoAlpha: 1, duration: 1.2, stagger: .1 }, '-=1.0');
    return tl;
  }

  /* ---------- Hero : parallax multicouche, pétales, souris ---------- */
  function initHeroScroll() {
    const st = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__video', { yPercent: 16, scale: 1.14, ease: 'none', scrollTrigger: st });
    gsap.to('#heroContent', { yPercent: -16, autoAlpha: 0, ease: 'none', scrollTrigger: { ...st, end: 'bottom 30%' } });
    gsap.to('#heroBadge', { yPercent: -60, rotation: 40, ease: 'none', scrollTrigger: st });
    $$('.float').forEach(f => {
      const depth = +f.dataset.depth || 20;
      gsap.to(f, { yPercent: -depth * 2.2, ease: 'none', scrollTrigger: st });
    });
  }

  function initHeroDecor() {
    const wrap = $('#petals');
    const count = desktop() ? 14 : 7;
    const colors = ['#F4D3CE', '#FBF3EA', '#B9A7DA', '#EBB8B3'];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.style.left = rnd(0, 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.opacity = rnd(.45, .9);
      const s = rnd(.6, 1.5);
      p.style.width = 14 * s + 'px'; p.style.height = 24 * s + 'px';
      wrap.append(p);
      const tw = gsap.fromTo(p,
        { y: -80, x: 0, rotation: rnd(0, 360) },
        { y: innerHeight + 100, x: rnd(-140, 140), rotation: '+=' + rnd(200, 520), duration: rnd(10, 18), ease: 'none', repeat: -1 });
      tw.progress(Math.random());
    }
    $$('.float').forEach((f, i) => {
      gsap.to(f, { rotation: '+=' + (i % 2 ? -5 : 6), scale: 1.05, duration: 4 + i * .9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });
    if (!fine) return;
    const hero = $('#hero');
    const setters = $$('.float').map(f => {
      const d = +f.dataset.depth || 20;
      return { d, x: gsap.quickTo(f, 'x', { duration: 1.2, ease: 'power3.out' }), y: gsap.quickTo(f, 'y', { duration: 1.2, ease: 'power3.out' }) };
    });
    hero.addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      setters.forEach(s => { s.x(nx * s.d * 1.6); s.y(ny * s.d); });
    });
  }

  /* ---------- Marquee : vitesse et sens liés au scroll ---------- */
  function initMarquee() {
    const tweens = $$('.marquee__row').map(row => {
      const track = $('.marquee__track', row);
      const base = track.innerHTML;
      let guard = 0;
      while (track.scrollWidth < innerWidth * 1.4 && guard++ < 6) track.insertAdjacentHTML('beforeend', base);
      track.insertAdjacentHTML('beforeend', track.innerHTML);
      const left = +row.dataset.dir === -1;
      return gsap.fromTo(track, { xPercent: left ? 0 : -50 }, { xPercent: left ? -50 : 0, duration: 42, ease: 'none', repeat: -1 });
    });
    let dir = 1, boost = 0, ts = 1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => {
        dir = self.direction || dir;
        boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 260, 9));
      }
    });
    gsap.ticker.add(() => {
      boost *= .93;
      ts += (dir * (1 + boost) - ts) * .1;
      tweens.forEach(t => t.timeScale(ts));
    });
  }

  /* ==========================================================================
     L'atelier : section pinnée, 4 étapes
     ========================================================================== */
  function initStory() {
    const steps = $$('.story__step'), imgs = $$('.story__frame img'), dots = $$('.story__dots li');
    const col = $('.story__numcol'), n = steps.length;
    const D = (n - 1) + .6;

    gsap.set(steps, { opacity: 0, y: 44 });
    gsap.set(steps[0], { opacity: 1, y: 0 });
    gsap.set(imgs, { clipPath: 'circle(0% at 50% 100%)', scale: 1.14 });
    gsap.set(imgs[0], { clipPath: 'circle(150% at 50% 100%)' });
    dots[0].classList.add('is-on');

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#storyPin', start: 'top top', end: () => '+=' + Math.round(innerHeight * (n - .2) * .85),
        pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: self => {
          const idx = Math.min(n - 1, Math.round(self.progress * D));
          dots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
        }
      }
    });
    for (let i = 1; i < n; i++) {
      tl.to(steps[i - 1], { opacity: 0, y: -44, duration: .35, ease: 'power2.in' }, i - .4)
        .to(steps[i], { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }, i - .1)
        .to(imgs[i], { clipPath: 'circle(150% at 50% 100%)', duration: .8, ease: 'power2.inOut' }, i - .5)
        .to(col, { yPercent: -(100 / n) * i, duration: .55, ease: 'power3.inOut' }, i - .4);
    }
    imgs.forEach((img, i) => tl.to(img, { scale: 1, duration: 1.4, ease: 'power1.out' }, Math.max(0, i - .5)));
    tl.to('.story__sprig', { rotation: 14, duration: D }, 0)
      .to('.story__ring', { x: 6, y: 4, duration: D }, 0)
      .to({}, { duration: .01 }, D);
  }

  /* ==========================================================================
     La carte : défilement horizontal piloté par le scroll (bureau),
     glisser tactile natif (mobile)
     ========================================================================== */
  function initCarte() {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const track = $('#carteTrack'), pin = $('#cartePin'), bar = $('#carteBar');
      const dist = () => Math.max(0, track.offsetWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .9,
          anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: self => gsap.set(bar, { scaleX: self.progress })
        }
      });
      $$('.card__img img').forEach(img => {
        gsap.fromTo(img, { xPercent: -5 }, {
          xPercent: 5, ease: 'none',
          scrollTrigger: { trigger: img.closest('.card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
        });
      });

      // clavier : tabuler sur un lien d'une carte hors écran fait défiler la section jusqu'à elle
      const st = tween.scrollTrigger;
      const onFocus = e => {
        const card = e.target.closest('.card');
        if (!card) return;
        const gut = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const reveal = () => {
          pin.scrollLeft = 0;
          const wanted = Math.min(dist(), Math.max(0, card.offsetLeft - gut));
          const y = st.start + (dist() ? wanted / dist() : 0) * (st.end - st.start);
          lenis.scrollTo(y, { immediate: true, force: true });
        };
        // saut direct (le défilement natif du focus a déjà eu lieu), recalé une seconde fois si besoin
        reveal();
        setTimeout(() => {
          const r = card.getBoundingClientRect();
          if (r.left < 0 || r.right > innerWidth) reveal();
        }, 120);
      };
      const resetScroll = () => { pin.scrollLeft = 0; };
      track.addEventListener('focusin', onFocus);
      pin.addEventListener('scroll', resetScroll);
      return () => { track.removeEventListener('focusin', onFocus); pin.removeEventListener('scroll', resetScroll); };
    });
    mm.add('(max-width: 900px)', () => {
      gsap.from('.card', {
        x: 60, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: .08,
        scrollTrigger: { trigger: '#carteTrack', start: 'top 85%' }
      });
    });
  }

  /* ==========================================================================
     Reveals génériques
     ========================================================================== */
  function initReveals() {
    $$('[data-split]').forEach(el => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 118, duration: 1.25, ease: 'power4.out', stagger: .07,
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 44, autoAlpha: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
    $$('[data-reveal-mask]').forEach(el => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power4.inOut',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
    $$('[data-parallax-img]').forEach(img => {
      gsap.fromTo(img, { yPercent: -8 }, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // chiffres : compteurs et arches qui se dessinent
    $$('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count), dec = +el.dataset.decimals || 0, o = { v: 0 };
      const fmt = v => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ /g, ' ');
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } })
      });
    });
    gsap.fromTo('.stat__arch', { clipPath: 'inset(100% 0 0 0)' }, {
      clipPath: 'inset(0% 0 0 0)', duration: 1.8, ease: 'power3.out', stagger: .15,
      scrollTrigger: { trigger: '.stats', start: 'top 82%' }
    });
    gsap.from('.stat__n, .stat__l', { y: 40, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.stats', start: 'top 82%' } });
    gsap.to('.chiffres__sprig--l', { yPercent: -30, rotation: 4, ease: 'none', scrollTrigger: { trigger: '.chiffres', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('.chiffres__sprig--r', { yPercent: 36, rotation: -34, ease: 'none', scrollTrigger: { trigger: '.chiffres', start: 'top bottom', end: 'bottom top', scrub: true } });

    // carte : entrée des cartes (bureau)
    gsap.from('.carte__head > *', { y: 40, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.carte', start: 'top 75%' } });

    // galerie : rideaux circulaires
    $$('.gal__item').forEach(it => {
      gsap.fromTo($('.gal__img', it), { clipPath: 'circle(0% at 50% 50%)' }, {
        clipPath: 'circle(82% at 50% 50%)', duration: 1.5, ease: 'power3.out',
        scrollTrigger: { trigger: it, start: 'top 90%' }
      });
    });

    // CTA
    gsap.fromTo('.cta__big', { xPercent: 6 }, { xPercent: -46, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.cta__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.cta__round', { scale: 0, rotation: -90, duration: 1.4, ease: 'back.out(1.5)', scrollTrigger: { trigger: '.cta__row', start: 'top 88%' } });

    // footer : le grand nom monte lettre par lettre
    gsap.from(footChars, { yPercent: 115, duration: 1.4, ease: 'power4.out', stagger: .05, scrollTrigger: { trigger: '#footGiant', start: 'top 95%' } });
  }

  /* ==========================================================================
     Avis : carrousel en éventail
     ========================================================================== */
  function initReviews(animated) {
    const stage = $('#revStage');
    if (!stage) return;
    const cards = $$('.review', stage), n = cards.length;
    const dotsWrap = $('#revDots'), prev = $('#revPrev'), next = $('#revNext'), live = $('#revLive');
    let idx = 0;

    const dots = cards.map((_, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', `Voir l'avis ${i + 1} sur ${n}`);
      b.addEventListener('click', () => go(i));
      li.append(b); dotsWrap.append(li);
      return b;
    });

    function layout(withMotion, withDelay) {
      const spread = Math.min(stage.clientWidth * .3, 300);
      cards.forEach((c, i) => {
        const o = i - idx, a = Math.abs(o);
        const vars = { x: o * spread, scale: 1 - a * .1, rotation: o * 4.5, y: a * 16, autoAlpha: a > 2 ? 0 : 1 - a * .2 };
        if (withMotion && window.gsap) {
          gsap.to(c, { ...vars, duration: .95, ease: 'power3.out', overwrite: true, delay: withDelay ? i * .08 : 0 });
        } else if (window.gsap) {
          gsap.set(c, vars);
        } else {
          c.style.transform = `translateX(${vars.x}px) scale(${vars.scale}) rotate(${vars.rotation}deg)`;
          c.style.opacity = vars.autoAlpha;
        }
        c.style.zIndex = 10 - a;
        c.setAttribute('aria-hidden', a ? 'true' : 'false');
        $$('a', c).forEach(l => { l.tabIndex = a ? -1 : 0; });
      });
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === idx)));
      prev.disabled = idx === 0;
      next.disabled = idx === n - 1;
    }
    function go(i) {
      idx = Math.max(0, Math.min(n - 1, i));
      layout(animated);
      live.textContent = `Avis ${idx + 1} sur ${n}`;
    }

    prev.addEventListener('click', () => go(idx - 1));
    next.addEventListener('click', () => go(idx + 1));
    $('#rev').addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
    });
    let sx = null;
    stage.addEventListener('pointerdown', e => { sx = e.clientX; });
    addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    });
    addEventListener('resize', () => layout(false));

    if (animated && window.gsap && window.ScrollTrigger) {
      gsap.set(cards, { x: 0, scale: .82, y: 70, autoAlpha: 0 });
      cards.forEach(c => { c.style.zIndex = 5; });
      ScrollTrigger.create({ trigger: '#rev', start: 'top 82%', once: true, onEnter: () => layout(true, true) });
      dots.forEach((d, i) => d.setAttribute('aria-current', String(i === 0)));
      prev.disabled = true;
    } else {
      layout(false);
    }
  }

  /* ==========================================================================
     Micro-interactions : boutons magnétiques, tilt 3D, curseur
     ========================================================================== */
  function initMagnetic() {
    if (!fine) return;
    const items = $$('.magnetic').map(el => ({
      el, inner: $('span', el),
      x: gsap.quickTo(el, 'x', { duration: .7, ease: 'elastic.out(1, .45)' }),
      y: gsap.quickTo(el, 'y', { duration: .7, ease: 'elastic.out(1, .45)' })
    }));
    let raf = null, mx = 0, my = 0;
    const tick = () => {
      raf = null;
      items.forEach(it => {
        const r = it.el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = mx - cx, dy = my - cy;
        const near = Math.abs(dx) < r.width / 2 + 46 && Math.abs(dy) < r.height / 2 + 46;
        if (near) {
          it.x(dx * .3); it.y(dy * .4);
          it.el.style.setProperty('--x', Math.max(0, Math.min(100, (mx - r.left) / r.width * 100)) + '%');
          it.el.style.setProperty('--y', Math.max(0, Math.min(100, (my - r.top) / r.height * 100)) + '%');
          it.active = true;
        } else if (it.active) {
          it.x(0); it.y(0); it.active = false;
        }
      });
    };
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  function attachTilt(el, max, lightEl) {
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3.out' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3.out' });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      ry((px - .5) * max * 2); rx(-(py - .5) * max * 2);
      el.style.setProperty('--mx', px * 100 + '%');
      el.style.setProperty('--my', py * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  function initTilt() {
    if (!fine) return;
    $$('[data-tilt]').forEach(c => attachTilt(c, 7));
    $$('[data-tilt-soft]').forEach(c => attachTilt(c, 4));
    $$('.gal__btn').forEach(c => attachTilt(c, 4));
  }

  function initCursor() {
    if (!fine) return;
    const c = $('#cursor'), label = $('span', c);
    const xTo = gsap.quickTo(c, 'x', { duration: .4, ease: 'power3' });
    const yTo = gsap.quickTo(c, 'y', { duration: .4, ease: 'power3' });
    addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest && e.target.closest('[data-cursor]');
      if (!t) return;
      label.textContent = t.dataset.cursor;
      gsap.to(c, { scale: 1, autoAlpha: 1, duration: .45, ease: 'power3.out', overwrite: 'auto' });
    });
    document.addEventListener('pointerout', e => {
      const t = e.target.closest && e.target.closest('[data-cursor]');
      if (t && !t.contains(e.relatedTarget)) gsap.to(c, { scale: .12, autoAlpha: 0, duration: .3, overwrite: 'auto' });
    });
  }

  /* ==========================================================================
     Navigation, menu mobile, progression, bouton flottant
     ========================================================================== */
  function initNav() {
    const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
    let hidden = false, open = false;
    const closed = 'circle(0% at calc(100% - 44px) 38px)', opened = 'circle(150% at calc(100% - 44px) 38px)';
    gsap.set(menu, { clipPath: closed });

    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => {
        const y = self.scroll();
        if (open) return;
        nav.classList.toggle('is-solid', y > 60);
        if (self.direction === 1 && y > 240 && !hidden) {
          hidden = true;
          gsap.to(nav, { yPercent: -110, duration: .6, ease: 'power3.out', overwrite: 'auto' });
        } else if (self.direction === -1 && hidden) {
          hidden = false;
          gsap.to(nav, { yPercent: 0, duration: .6, ease: 'power3.out', overwrite: 'auto' });
        }
      }
    });

    function toggleMenu(force) {
      open = typeof force === 'boolean' ? force : !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', String(!open));
      nav.classList.toggle('menu-open', open);
      if (open) {
        lenis.stop();
        gsap.set(menu, { visibility: 'visible' });
        gsap.to(menu, { clipPath: opened, duration: 1, ease: 'power4.inOut' });
        gsap.fromTo('.menu__links a', { yPercent: 115 }, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: .07, delay: .3 });
        gsap.fromTo('.menu__foot', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .8, delay: .7 });
      } else {
        lenis.start();
        gsap.to(menu, { clipPath: closed, duration: .8, ease: 'power4.inOut', onComplete: () => gsap.set(menu, { visibility: 'hidden' }) });
      }
    }
    burger.addEventListener('click', () => toggleMenu());
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) { toggleMenu(false); burger.focus(); } });

    // ancres : défilement fluide via Lenis
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (open) toggleMenu(false);
      lenis.scrollTo(target, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4), immediate: false });
    });
  }

  function initProgress() {
    gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });
  }

  function initFab() {
    const fab = $('#fab');
    let pastHero = false, inCta = 0;
    const apply = () => gsap.to(fab, { y: pastHero && !inCta ? 0 : '160%', duration: .7, ease: 'power3.out', overwrite: 'auto' });
    ScrollTrigger.create({ trigger: '#hero', start: 'bottom 75%', onEnter: () => { pastHero = true; apply(); }, onLeaveBack: () => { pastHero = false; apply(); } });
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { en.target._in = en.isIntersecting; });
      inCta = ['#rdv', '#infos', '#footer'].some(s => $(s)._in) ? 1 : 0;
      apply();
    }, { threshold: .25 });
    ['#rdv', '#infos', '#footer'].forEach(s => io.observe($(s)));
  }

  /* ==========================================================================
     Démarrage
     ========================================================================== */
  initPhone();
  initOpenStatus();
  initSeance(true);
  initFaq();
  initLightbox(() => lenis.stop(), () => lenis.start());
  initMagnetic();
  initTilt();
  initCursor();
  initProgress();
  initNav();
  initFab();
  initStory();
  initCarte();
  initReveals();
  initMarquee();
  initHeroDecor();
  initReviews(true);

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  runLoader().then(runIntro);
})();
