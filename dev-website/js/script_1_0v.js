/**
 * Team T Studio - Dev Website
 * Idioma configurable, launcher del juego y preferencias locales.
 */

(function () {
  'use strict';

  /* ---------- Configuration ---------- */

  var DEFAULT_GAME_SERVER = 'http://192.168.2.1';
  var PROBE_TIMEOUT = 4000;
  var STORAGE = { lang: 'tts:lang', server: 'tts:server' };
  var SUPPORTED = ['en', 'es'];

  var SECTIONS = ['inicio', 'jugar', 'controles', 'proyectos', 'nosotros', 'config', 'contacto'];

  /* ---------- Translations ---------- */

  var I18N = {
    en: {
      'a11y.skip': 'Skip to content',
      'a11y.menu.open': 'Open menu',
      'a11y.menu.close': 'Close menu',

      'nav.play': 'Play',
      'nav.work': 'Work',
      'nav.studio': 'Studio',
      'nav.settings': 'Settings',
      'nav.contact': 'Contact',
      'nav.playCta': 'Play now',

      'hero.eyebrow': 'Independent game studio',
      'hero.subtitle': 'Creators of realities · Developers of FAFI 1.6',
      'hero.ctaPlay': 'Play FAFI 1.6',
      'hero.ctaWork': 'Explore projects',

      'status.checking': 'Checking server…',
      'status.online': 'Server online',
      'status.offline': 'Server offline',
      'status.local': 'Local preview',

      'launcher.eyebrow': 'Now shipping',
      'launcher.desc': 'A tactical history shooter built for the browser. No install, no launcher client — just your keyboard, your mouse and the round timer.',
      'launcher.play': 'Launch game',
      'launcher.controls': 'Controls',

      'facts.modes': 'Modes',
      'facts.modesValue': '2 — Aim Practice, Dust II',
      'facts.platform': 'Platform',
      'facts.platformValue': 'Browser (desktop)',
      'facts.price': 'Price',
      'facts.priceValue': 'Free',
      'facts.server': 'Server',

      'mode1.title': 'Aim Practice',
      'mode1.desc': 'Thirty seconds. Moving targets in the gallery range, every weapon unlocked from the first second. Built to warm up your aim and track your accuracy.',
      'mode2.title': 'Dust II — Exploration',
      'mode2.desc': 'Start with a knife and $3000, pick Terrorist or Counter-Terrorist spawn, then press <kbd>B</kbd> for the buy menu: Deagle, AK-47, AWP and more.',

      'controls.title': 'Controls',
      'controls.move': 'Move',
      'controls.crouch': 'Crouch / sprint',
      'controls.jump': 'Jump (Dust II)',
      'controls.fire': 'Fire / knife',
      'controls.aim': 'Aim / scope (AWP)',
      'controls.reload': 'Reload',
      'controls.inspect': 'Inspect weapon',
      'controls.swap': 'Change weapon',
      'controls.slots': 'Weapon slots',
      'controls.buy': 'Buy menu (Dust II)',
      'controls.menu': 'Back to menu',
      'controls.debug': 'Debug overlay',

      'projects.title': 'Projects',
      'projects.live': 'Playable',
      'projects.p1': 'Tactical history shooter, our first project. Aim Practice and a full Dust II exploration map, playable in the browser.',
      'projects.p1cta': 'Play now',
      'projects.soon': 'In development',
      'projects.p2': 'Platform for improving at competitive games. Currently in the pre-production phase.',
      'projects.p2cta': 'Coming soon',

      'team.title': 'Development Team',
      'team.role1': 'Lead Developer / R&D',
      'team.role2': 'Frontend Designer / Technical Writer',
      'team.role3': 'Backend Developer',

      'about.title': 'About Team T Studio',
      'about.body': 'We are an independent studio passionate about video game development. Our goal is to create memorable experiences by combining polished gameplay with strong visual identities. With the launch of <strong>FAFI 1.6</strong>, we aim to establish ourselves in the industry and build a solid community of players.',

      'settings.title': 'Settings',
      'settings.localTag': 'Saved on this device',
      'settings.langTitle': 'Language',
      'settings.langDesc': 'Choose the language of this site.',
      'settings.serverTitle': 'Game server address',
      'settings.serverDesc': 'Where the launcher sends you when you press play. The server address can change, so you can edit it here.',
      'settings.serverLabel': 'Server address',
      'settings.save': 'Save',
      'settings.saved': 'Saved',
      'settings.invalid': 'Invalid address',
      'settings.testing': 'Testing connection…',
      'settings.reachable': 'Reachable',
      'settings.unreachable': 'No response',

      'footer.playServer': 'Play on the server',
      'footer.game': 'Game',
      'footer.discord': 'Discord',
      'footer.instagram': 'Instagram',
      'footer.rights': 'Team T Studio. All rights reserved.'
    },

    es: {
      'a11y.skip': 'Ir al contenido',
      'a11y.menu.open': 'Abrir menú',
      'a11y.menu.close': 'Cerrar menú',

      'nav.play': 'Jugar',
      'nav.work': 'Proyectos',
      'nav.studio': 'Estudio',
      'nav.settings': 'Configuración',
      'nav.contact': 'Contacto',
      'nav.playCta': 'Jugar ahora',

      'hero.eyebrow': 'Estudio independiente de videojuegos',
      'hero.subtitle': 'Creadores de realidades · Desarrolladores de FAFI 1.6',
      'hero.ctaPlay': 'Jugar FAFI 1.6',
      'hero.ctaWork': 'Ver proyectos',

      'status.checking': 'Verificando servidor…',
      'status.online': 'Servidor en línea',
      'status.offline': 'Servidor fuera de línea',
      'status.local': 'Vista local',

      'launcher.eyebrow': 'Ya disponible',
      'launcher.desc': 'Un shooter táctico histórico hecho para el navegador. Sin instalar nada y sin cliente de arranque: solo tu teclado, tu mouse y el reloj de la ronda.',
      'launcher.play': 'Abrir juego',
      'launcher.controls': 'Controles',

      'facts.modes': 'Modos',
      'facts.modesValue': '2 — Aim Practice, Dust II',
      'facts.platform': 'Plataforma',
      'facts.platformValue': 'Navegador (escritorio)',
      'facts.price': 'Precio',
      'facts.priceValue': 'Gratis',
      'facts.server': 'Servidor',

      'mode1.title': 'Aim Practice',
      'mode1.desc': 'Treinta segundos. Blancos móviles en la galería, con todas las armas desbloqueadas desde el primer segundo. Ideal para calentar la puntería y medir tu precisión.',
      'mode2.title': 'Dust II — Exploración',
      'mode2.desc': 'Empiezas con cuchillo y $3000, elegís bando Terrorista o Antiterrorista y apretás <kbd>B</kbd> para el menú de compra: Deagle, AK-47, AWP y más.',

      'controls.title': 'Controles',
      'controls.move': 'Moverse',
      'controls.crouch': 'Agacharse / sprint',
      'controls.jump': 'Saltar (Dust II)',
      'controls.fire': 'Disparar / apuñalar',
      'controls.aim': 'Mirar / lupa (AWP)',
      'controls.reload': 'Recargar',
      'controls.inspect': 'Inspeccionar arma',
      'controls.swap': 'Cambiar arma',
      'controls.slots': 'Ranuras de arma',
      'controls.buy': 'Menú de compra (Dust II)',
      'controls.menu': 'Volver al menú',
      'controls.debug': 'Panel de debug',

      'projects.title': 'Proyectos',
      'projects.live': 'Jugable',
      'projects.p1': 'Shooter táctico histórico, nuestro primer proyecto. Aim Practice y un mapa completo de exploración Dust II, jugables en el navegador.',
      'projects.p1cta': 'Jugar ahora',
      'projects.soon': 'En desarrollo',
      'projects.p2': 'Plataforma para mejorar en juegos competitivos. Actualmente en fase de preproducción.',
      'projects.p2cta': 'Próximamente',

      'team.title': 'Equipo de desarrollo',
      'team.role1': 'Desarrollador líder / I+D',
      'team.role2': 'Diseñador frontend / Redactor técnico',
      'team.role3': 'Desarrollador backend',

      'about.title': 'Sobre Team T Studio',
      'about.body': 'Somos un estudio independiente apasionado por el desarrollo de videojuegos. Nuestro objetivo es crear experiencias memorables combinando gameplay pulido con identidades visuales fuertes. Con el lanzamiento de <strong>FAFI 1.6</strong>, queremos consolidarnos en la industria y construir una comunidad sólida de jugadores.',

      'settings.title': 'Configuración',
      'settings.localTag': 'Guardado en este dispositivo',
      'settings.langTitle': 'Idioma',
      'settings.langDesc': 'Elegí el idioma de este sitio.',
      'settings.serverTitle': 'Dirección del servidor',
      'settings.serverDesc': 'A dónde te manda el launcher cuando apretás jugar. La dirección del servidor puede cambiar, así que podés editarla acá.',
      'settings.serverLabel': 'Dirección del servidor',
      'settings.save': 'Guardar',
      'settings.saved': 'Guardado',
      'settings.invalid': 'Dirección inválida',
      'settings.testing': 'Probando conexión…',
      'settings.reachable': 'Responde',
      'settings.unreachable': 'Sin respuesta',

      'footer.playServer': 'Jugar en el servidor',
      'footer.game': 'Juego',
      'footer.discord': 'Discord',
      'footer.instagram': 'Instagram',
      'footer.rights': 'Team T Studio. Todos los derechos reservados.'
    }
  };

  /* ---------- Helpers ---------- */

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* Modo privado o storage bloqueado: la preferencia solo vive en memoria. */
    }
  }

  function preferredLanguage() {
    var stored = read(STORAGE.lang);
    if (SUPPORTED.indexOf(stored) !== -1) return stored;

    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (SUPPORTED.indexOf(nav) !== -1) return nav;

    return 'en';
  }

  function normalizeServerUrl(raw) {
    var value = String(raw == null ? '' : raw).trim();
    if (!value || /\s/.test(value)) return null;

    if (!/^https?:\/\//i.test(value)) value = 'http://' + value;

    var parsed;
    try {
      parsed = new URL(value);
    } catch (err) {
      return null;
    }

    if (!parsed.hostname) return null;
    if (parsed.hostname.indexOf('.') === -1 && parsed.hostname !== 'localhost') return null;

    parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/';
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  }

  function currentServer() {
    return normalizeServerUrl(read(STORAGE.server)) || DEFAULT_GAME_SERVER;
  }

  function t(key) {
    var lang = document.documentElement.getAttribute('data-lang') || 'en';
    var dict = I18N[lang] || I18N.en;
    return Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
  }

  /* ---------- Language ---------- */

  function applyLanguage(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';

    var dict = I18N[lang];
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.textContent = dict[key];
    });

    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.innerHTML = dict[key];
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      if (Object.prototype.hasOwnProperty.call(dict, key)) el.setAttribute('aria-label', dict[key]);
    });

    syncLangButtons(lang);
    refreshStatusLabel();
  }

  function syncLangButtons(lang) {
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-checked', String(btn.getAttribute('data-set-lang') === lang));
    });
  }

  function initLangSwitch() {
    document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = btn.getAttribute('data-set-lang');
        write(STORAGE.lang, lang);
        applyLanguage(lang);
      });
    });
  }

  /* ---------- Launcher ---------- */

  function applyServer() {
    var url = currentServer();
    var display = url.replace(/\/$/, '');

    document.querySelectorAll('[data-launch]').forEach(function (el) {
      el.setAttribute('href', url);
    });

    document.querySelectorAll('[data-server-display]').forEach(function (el) {
      el.textContent = display;
    });

    return url;
  }

  function fetchWithTimeout(url, timeout) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeout);

    function clear() { clearTimeout(timer); }

    return fetch(url, {
      mode: 'no-cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal
    }).then(
      function (response) { clear(); return response; },
      function (error) { clear(); throw error; }
    );
  }

  function probeServer(url) {
    if (window.location.protocol === 'file:') return Promise.resolve('local');

    var candidates = ['/health', '/'];

    function attempt(index) {
      if (index >= candidates.length) return Promise.resolve('offline');

      return fetchWithTimeout(url + candidates[index], PROBE_TIMEOUT)
        .then(function () { return 'online'; }, function () { return attempt(index + 1); });
    }

    return attempt(0);
  }

  var currentStatus = 'checking';

  function setStatus(state) {
    currentStatus = state;
    refreshStatusLabel();
  }

  function refreshStatusLabel() {
    var pill = document.getElementById('heroStatus');
    if (!pill) return;

    var keys = {
      checking: 'status.checking',
      online: 'status.online',
      offline: 'status.offline',
      local: 'status.local'
    };

    pill.setAttribute('data-status', currentStatus);

    var text = pill.querySelector('.status-text');
    if (text) text.textContent = t(keys[currentStatus] || 'status.checking');
  }

  function initLauncher() {
    var url = applyServer();
    refreshStatusLabel();
    probeServer(url).then(setStatus);
  }

  /* ---------- Server settings ---------- */

  function initServerForm() {
    var form = document.getElementById('serverForm');
    var input = document.getElementById('serverInput');
    var feedback = document.getElementById('serverFeedback');
    if (!form || !input || !feedback) return;

    input.value = currentServer().replace(/\/$/, '');

    function say(key, state) {
      feedback.setAttribute('data-state', state);
      feedback.textContent = t(key);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var url = normalizeServerUrl(input.value);
      if (!url) {
        input.setAttribute('aria-invalid', 'true');
        say('settings.invalid', 'error');
        return;
      }

      input.removeAttribute('aria-invalid');
      write(STORAGE.server, url);
      input.value = url.replace(/\/$/, '');
      applyServer();
      setStatus('checking');
      refreshStatusLabel();

      say('settings.testing', 'busy');

      probeServer(url).then(function (state) {
        setStatus(state);
        if (state === 'offline' || state === 'local') {
          say('settings.unreachable', 'error');
        } else {
          say('settings.reachable', 'ok');
        }
      });
    });

    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid');
      feedback.setAttribute('data-state', 'idle');
      feedback.textContent = '';
    });
  }

  /* ---------- Mobile menu ---------- */

  function initMobileMenu() {
    var toggle = document.getElementById('navToggle');
    var menu = document.getElementById('mobileMenu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', t(open ? 'a11y.menu.close' : 'a11y.menu.open'));
      menu.hidden = !open;
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) setOpen(false);
    });

    setOpen(false);
  }

  /* ---------- Scroll spy ---------- */

  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[data-nav]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var visible = Object.create(null);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting ? entry.intersectionRatio : 0;
      });

      var bestId = null;
      var bestRatio = 0;
      Object.keys(visible).forEach(function (id) {
        if (visible[id] > bestRatio) {
          bestRatio = visible[id];
          bestId = id;
        }
      });

      links.forEach(function (link) {
        link.classList.toggle('is-active', bestId !== null && link.getAttribute('data-nav') === bestId);
      });
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] });

    SECTIONS.forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* ---------- Scroll reveal ---------- */

  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var targets = document.querySelectorAll(
      '.launcher-panel, .mode-card, .controls-grid, .project-card, .team-member, .about, .setting'
    );

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.style.transitionDelay = '';
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    targets.forEach(function (el, index) {
      el.classList.add('reveal');
      el.style.transitionDelay = (index % 4) * 60 + 'ms';
      observer.observe(el);
    });
  }

  /* ---------- Footer year ---------- */

  function initYear() {
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });
  }

  /* ---------- Boot ---------- */

  function init() {
    initYear();
    applyLanguage(preferredLanguage());
    initLangSwitch();
    initServerForm();
    initLauncher();
    initMobileMenu();
    initScrollSpy();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
