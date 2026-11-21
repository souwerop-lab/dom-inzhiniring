(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var still = /[?&]still=1/.test(location.search);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' '); };

  /* день / ночь */
  var tgl = $('#tgl');
  function setTheme(t, save) {
    root.setAttribute('data-theme', t);
    if (tgl) tgl.setAttribute('aria-pressed', t === 'night');
    if (save) { try { localStorage.setItem('de-theme', t); } catch (e) {} }
  }
  var cur = 'day';
  try { cur = localStorage.getItem('de-theme') === 'night' ? 'night' : 'day'; } catch (e) {}
  setTheme(cur, false);
  if (tgl) tgl.addEventListener('click', function () {
    setTheme(root.getAttribute('data-theme') === 'night' ? 'day' : 'night', true);
  });

  if (still) $$('img[loading=lazy]').forEach(function (i) { i.loading = 'eager'; });

  /* меню */
  var burger = $('#burger'), nav = $('#nav');
  if (burger) burger.addEventListener('click', function () {
    var o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  var path = location.pathname.replace(/\/$/, '');
  $$('#nav a').forEach(function (a) {
    try { var p = new URL(a.href).pathname.replace(/\/$/, ''); if (p && p === path) a.classList.add('is-current'); } catch (e) {}
  });

  /* появление при прокрутке */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    rv.forEach(function (el) { var idx = Array.prototype.indexOf.call(el.parentNode.children, el); el.style.transitionDelay = Math.min(idx, 5) * 120 + 'ms'; io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* схема дома: трубы «рисуются», по ним бежит вода */
  var pipes = $$('#pipes .pipe');
  if (pipes.length) {
    if (!reduce) {
      pipes.forEach(function (p, i) {
        if (p.classList.contains('pipe--sew')) return;
        var len = Math.ceil(p.getTotalLength());
        p.style.setProperty('--len', len);
        p.style.animationDelay = (i * 0.18) + 's';
        p.classList.add('pipe-draw');
      });
      $$('#flows .flow').forEach(function (f) { f.style.opacity = 0; setTimeout(function () { f.style.transition = 'opacity 1s'; f.style.opacity = .85; }, 1800); });
    } else $$('#flows .flow').forEach(function (f) { f.style.display = 'none'; });
  }
  var card = $('#nodecard');
  if (card) {
    var data = {};
    try { data = JSON.parse(card.getAttribute('data-nodes') || '{}'); } catch (e) {}
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var show = function (k) {
      var d = data[k]; if (!d) return;
      card.classList.remove('is-hint');
      card.innerHTML = '<h3>' + esc(d.title) + '</h3><p>' + esc(d.service) + '. ' + esc(d.text) + '</p><div class="nodecard__row"><span class="nodecard__price">' + esc(d.price) + '</span><a class="btn btn--sm" href="' + esc(d.calc) + '">Рассчитать</a><a href="' + esc(d.url) + '">Подробнее</a></div>';
      $$('.node').forEach(function (n) { n.classList.toggle('is-on', n.getAttribute('data-node') === k); });
    };
    $$('.node').forEach(function (n) {
      var k = n.getAttribute('data-node');
      n.addEventListener('click', function () { show(k); });
      n.addEventListener('mouseenter', function () { show(k); });
      n.addEventListener('focus', function () { show(k); });
      n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(k); } });
    });
  }

  /* счётчики */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count')), suffix = el.textContent.replace(/[\d\s]/g, '');
    if (reduce || still || !target || !('IntersectionObserver' in window)) return;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function tick(t) {
        var p = Math.min(1, (t - t0) / 1500), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
    o.observe(el);
  });

  /* калькулятор */
  var calc = $('#de-calc');
  if (calc) {
    var items = JSON.parse(calc.getAttribute('data-items') || '[]');
    var rows = $$('.calc__row', calc), sumEl = $('#calc-sum'), listEl = $('#calc-list'), go = $('#calc-go');
    var shown = 0, anim;
    var update = function () {
      var total = 0, html = '', text = [];
      rows.forEach(function (r) {
        var it = items[+r.getAttribute('data-i')], on = $('input[type=checkbox]', r).checked, rng = $('input[type=range]', r), v = parseFloat(rng.value);
        r.classList.toggle('is-on', on);
        $('output', r).textContent = v + ' ' + it.unit;
        if (!on) return;
        var cost = it.base + it.rate * v; total += cost;
        html += '<li><span>' + it.title + '</span><span>' + fmt(cost) + ' ₽</span></li>';
        text.push(it.title + ': ' + it.label.toLowerCase() + ' ' + v + ' ' + it.unit + ', ориентир ' + fmt(cost) + ' ₽');
      });
      listEl.innerHTML = html || '<li><span>Выберите хотя бы одну систему</span></li>';
      var from = shown; cancelAnimationFrame(anim);
      var t0 = performance.now();
      (function tick(t) {
        var p = (reduce || still) ? 1 : Math.min(1, (t - t0) / 500);
        shown = from + (total - from) * (1 - Math.pow(1 - p, 3));
        sumEl.textContent = fmt(shown) + ' ₽';
        if (p < 1) anim = requestAnimationFrame(tick);
      })(t0);
      sumEl.setAttribute('data-total', total);
      go.href = calc.getAttribute('data-contact') + '?calc=' + encodeURIComponent(text.join('; ') + '. Итого ориентир ' + fmt(total) + ' ₽') + '#zayavka';
    };
    calc.addEventListener('input', update); calc.addEventListener('change', update);
    update();
  }
  /* подстановка расчёта в заявку */
  var msg = $('#f-message');
  if (msg) { var m = /[?&]calc=([^&#]+)/.exec(location.search); if (m) { try { msg.value = 'Расчёт с сайта: ' + decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) {} } }
  /* галерея объекта: стрелки, миниатюры, свайп, крупный просмотр */
  var gl = $('#gl');
  if (gl) {
    var slides = $$('.gl__slide', gl), thumbs = $$('.gl__thumb', gl), track = $('.gl__track', gl), capEl = $('.gl__capt', gl), cntEl = $('.gl__cnt', gl);
    var n = slides.length, idx = 0;
    var caps = slides.map(function (s) { return s.getAttribute('data-cap') || ''; });
    var srcs = slides.map(function (s) { return s.getAttribute('data-full'); });
    var lb = $('#lb'), lbImg = $('img', lb), lbCap = $('.lb__cap', lb);
    var go = function (i) {
      idx = (i + n) % n;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      thumbs.forEach(function (t, k) { t.classList.toggle('on', k === idx); });
      capEl.textContent = caps[idx]; cntEl.textContent = (idx + 1) + ' / ' + n;
      if (lb.classList.contains('open')) { lbImg.src = srcs[idx]; lbCap.textContent = caps[idx]; }
    };
    $('.gl__prev', gl).addEventListener('click', function (e) { e.stopPropagation(); go(idx - 1); });
    $('.gl__next', gl).addEventListener('click', function (e) { e.stopPropagation(); go(idx + 1); });
    thumbs.forEach(function (t, k) { t.addEventListener('click', function () { go(k); }); });
    var main = $('.gl__main', gl), x0 = null, moved = false;
    main.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; moved = false; }, { passive: true });
    main.addEventListener('touchmove', function (e) { if (x0 !== null && Math.abs(e.touches[0].clientX - x0) > 12) moved = true; }, { passive: true });
    main.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); }
    });
    var open = function () { lb.classList.add('open'); lbImg.src = srcs[idx]; lbCap.textContent = caps[idx]; document.body.style.overflow = 'hidden'; };
    var close = function () { lb.classList.remove('open'); document.body.style.overflow = ''; };
    main.addEventListener('click', function () { if (!moved) open(); moved = false; });
    $('.lb__x', lb).addEventListener('click', close);
    $('.lb__p', lb).addEventListener('click', function () { go(idx - 1); });
    $('.lb__n', lb).addEventListener('click', function () { go(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    var lx = null;
    lb.addEventListener('touchstart', function (e) { lx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (lx === null) return; var d = e.changedTouches[0].clientX - lx; lx = null; if (Math.abs(d) > 40) go(idx + (d < 0 ? 1 : -1)); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') go(idx - 1);
      if (e.key === 'ArrowRight') go(idx + 1);
    });
    go(0);
  }
})();
