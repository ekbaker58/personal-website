/*
  Ethan Baker — personal site
  Everything you read on the page comes from site-content.json.
  This file turns that data into the page and runs the interactive parts:
  the race-track timeline, the games player, the two-time-zone watch, and the theme toggle.
  Helpers shared with the project pages (links, theme, project cards) are in common.js.
*/
(() => {
  'use strict';

  const {
    el, svg, isFilled, isSafeHref, categoryClass, isExternal, setupTheme, setupEmailCopy, renderNavigation,
    publishedProjects, renderProjectCard, renderContactPanel, renderFooter: renderSharedFooter, usablePhotos, renderMedia,
    renderLoadError, loadContent
  } = window.EB;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function validSortKey(value) {
    return /^\d{4}-\d{2}$/.test(value) ? value : null;
  }

  function sectionShell(id, title, className) {
    const section = el('section', `section ${className || ''}`.trim());
    section.id = id;
    const heading = el('h2', 'section-title', title);
    heading.id = `${id}-heading`;
    section.setAttribute('aria-labelledby', heading.id);
    const inner = el('div', 'wrap');
    inner.append(heading);
    section.append(inner);
    return { section, inner, heading };
  }

  // ---------- hero ----------
  function renderHero(mount, site) {
    const hero = site.hero;
    const section = el('section', 'hero');
    section.id = 'top';
    section.setAttribute('aria-labelledby', 'hero-name');

    const shapes = el('div', 'hero-shapes');
    shapes.setAttribute('aria-hidden', 'true');
    shapes.append(
      el('span', 'shape shape-sun'),
      el('span', 'shape shape-ring'),
      el('span', 'shape shape-tri'),
      el('span', 'shape shape-dots')
    );
    const livery = el('div', 'livery');
    livery.append(el('span', 'band band-1'), el('span', 'band band-2'), el('span', 'band band-3'));
    shapes.append(livery);

    const inner = el('div', 'wrap hero-inner');
    const copy = el('div', 'hero-copy');

    // "Open to a Summer 2027 internship": the first thing a recruiter should see.
    const availability = hero.availability;
    if (availability && isFilled(availability.label) && isSafeHref(availability.href)) {
      const badge = el('a', 'hero-availability');
      badge.href = availability.href;
      const dot = el('span', 'hero-availability-dot');
      dot.setAttribute('aria-hidden', 'true');
      badge.append(dot, el('span', 'hero-availability-label', availability.label));
      if (isFilled(availability.detail)) badge.append(el('span', 'sr-only', ': '), el('span', 'hero-availability-detail', availability.detail));
      copy.append(badge);
    }

    copy.append(el('p', 'hero-location', hero.location));

    const name = el('h1', 'hero-name');
    name.id = 'hero-name';
    const parts = hero.name.split(' ');
    name.append(el('span', 'hero-first', parts[0]), el('span', 'hero-last', parts.slice(1).join(' ')));
    copy.append(name);
    copy.append(el('p', 'hero-headline', hero.headline));
    if (isFilled(hero.lede)) copy.append(el('p', 'hero-lede', hero.lede));

    // Contact buttons up top, so visitors can reach Ethan without scrolling. The addresses come from
    // contact.links (the one place links are kept); a button only shows once its link is filled in.
    const links = (site.contact.links || []).filter(link => isSafeHref(link.href));
    const linkedin = links.find(link => /^https:\/\/(www\.)?linkedin\.com\//.test(link.href));
    const email = links.find(link => link.href.startsWith('mailto:'));
    const resume = links.find(link => /\.pdf$/.test(link.href));
    const connect = hero.connect || {};
    const actions = el('div', 'hero-actions');
    [[linkedin, connect.linkedinLabel], [email, connect.emailLabel], [resume, connect.resumeLabel]].forEach(([link, label]) => {
      if (!link || !isFilled(label)) return;
      const button = el('a', actions.childElementCount ? 'btn btn-outline' : 'btn btn-solid', label);
      button.href = link.href;
      if (isExternal(link.href)) { button.target = '_blank'; button.rel = 'noopener'; }
      actions.append(button);
    });
    if (actions.childElementCount) copy.append(actions);

    const more = el('p', 'hero-more');
    [hero.primaryAction, hero.secondaryAction].forEach(action => {
      if (!action || !isSafeHref(action.href)) return;
      const link = el('a', '', action.label);
      link.href = action.href;
      more.append(link);
    });
    if (more.childElementCount) copy.append(more);

    inner.append(copy, renderTower(site.stats));
    section.append(shapes, inner, el('div', 'checker'));
    mount.append(section);
  }

  // The results list, styled like a race timing tower.
  function renderTower(stats) {
    const tower = el('aside', 'tower');
    tower.setAttribute('aria-labelledby', 'tower-title');
    const title = el('h2', 'tower-title', stats.label);
    title.id = 'tower-title';
    const list = el('ol', 'tower-list');
    stats.items.filter(item => isFilled(item.value) && isFilled(item.label)).forEach(item => {
      const row = el('li', `tower-row ${categoryClass(item.category)}`);
      row.append(el('span', 'tower-value', item.value), el('span', 'tower-label', item.label));
      list.append(row);
    });
    tower.append(title, list);
    return tower;
  }

  // ---------- about ----------
  function renderAbout(mount, about) {
    const { section, inner } = sectionShell('about', about.heading, 'about');
    const grid = el('div', 'about-grid');
    const story = el('div', 'about-story');
    if (isFilled(about.title)) story.append(el('p', 'about-lead', about.title));
    about.paragraphs.filter(isFilled).forEach(text => story.append(el('p', '', text)));

    const spec = el('aside', 'spec');
    spec.setAttribute('aria-labelledby', 'spec-title');
    const specTitle = el('h3', 'spec-title', about.skillsHeading);
    specTitle.id = 'spec-title';
    const groups = el('dl', 'spec-list');
    about.skills.forEach(group => {
      const items = group.items.filter(isFilled);
      if (!items.length) return;
      const row = el('div', 'spec-row');
      row.append(el('dt', '', group.group));
      const dd = el('dd');
      const ul = el('ul');
      items.forEach(item => ul.append(el('li', '', item)));
      dd.append(ul);
      row.append(dd);
      groups.append(row);
    });
    spec.append(specTitle, groups);

    grid.append(story, spec);
    inner.append(grid);
    mount.append(section);
  }

  // ---------- projects ----------
  function renderProjects(mount, site, projects) {
    if (!projects.length) return;
    const cfg = site.projectsSection;
    const { section, inner } = sectionShell('projects', cfg.title, 'projects');
    if (isFilled(cfg.intro)) inner.append(el('p', 'section-intro', cfg.intro));
    const grid = el('div', 'project-grid');
    projects.forEach(project => grid.append(renderProjectCard(project, site, '')));
    inner.append(grid);
    mount.append(section);
  }

  // ---------- the race-track timeline ----------
  function renderStop(item, labels) {
    const stop = el('li', `stop ${categoryClass(item.category)} status-${item.status}`);
    stop.dataset.category = item.category;
    stop.dataset.tier = item.tier;
    stop.dataset.date = item.date;
    stop.dataset.dateLabel = item.dateLabel;
    stop.dataset.title = item.title;

    const date = el('p', 'stop-date', item.dateLabel);
    const categoryLabel = labels.filters.find(filter => filter.id === item.category)?.label || item.category;
    const statusText = el('span', 'sr-only', `, ${labels.statusLabels[item.status] || item.status}`);

    const detail = el('div', 'stop-detail');
    const meta = [item.org, item.location].filter(isFilled);
    if (meta.length) detail.append(el('p', 'stop-meta', meta.join(', ')));
    if (!item.holdDetails) {
      if (isFilled(item.summary)) detail.append(el('p', 'stop-summary', item.summary));
      const bullets = (item.details || []).filter(isFilled);
      if (bullets.length) {
        const ul = el('ul', 'stop-bullets');
        bullets.forEach(text => ul.append(el('li', '', text)));
        detail.append(ul);
      }
      // Photos and videos for stops without a project page. They only load once the stop is opened.
      const media = usablePhotos(item);
      if (media.length) {
        const row = el('div', 'stop-media');
        media.forEach(photo => row.append(renderMedia(photo, '', 'stop-photo', labels.openPhotoLabel || '')));
        detail.append(row);
      }
    }
    // Project pages and a few sections on this page. Labels come from timelineSection.linkLabels.
    const linkLabels = labels.linkLabels || {};
    let linkLabel = null;
    if (isSafeHref(item.link)) {
      if (item.link.startsWith('projects/')) linkLabel = linkLabels.project;
      else if (item.link === '#games') linkLabel = linkLabels.games;
      else if (item.link === '#contact') linkLabel = linkLabels.contact;
    }
    if (isFilled(linkLabel)) {
      const link = el('a', 'stop-link', linkLabel);
      link.href = item.link;
      detail.append(link);
    }

    const head = [el('span', 'stop-tag', categoryLabel), el('span', 'stop-title', item.title), statusText];
    let body;
    if (detail.childElementCount) {
      body = el('details', 'stop-body');
      const summary = el('summary', 'stop-summary-row');
      summary.append(...head, el('span', 'stop-toggle'));
      summary.lastChild.setAttribute('aria-hidden', 'true');
      body.append(summary, detail);
    } else {
      body = el('div', 'stop-body is-static');
      const row = el('div', 'stop-summary-row');
      row.append(...head);
      body.append(row);
    }
    stop.append(date, body);
    return stop;
  }

  function renderTrack(mount, cfg, timeline) {
    const { section, inner } = sectionShell('track', cfg.title, 'track-section');
    inner.append(el('p', 'section-intro', cfg.intro));

    // filters
    const controls = el('div', 'track-controls');
    const filterGroup = el('div', 'filters');
    filterGroup.setAttribute('role', 'group');
    filterGroup.setAttribute('aria-label', cfg.filterLabel);
    const filterButtons = cfg.filters.map(filter => {
      const button = el('button', `filter ${filter.id === 'all' ? 'filter-all' : categoryClass(filter.id)}`);
      button.type = 'button';
      button.dataset.filter = filter.id;
      button.setAttribute('aria-pressed', String(filter.id === 'all'));
      button.append(el('span', 'filter-swatch'), el('span', '', filter.label));
      button.firstChild.setAttribute('aria-hidden', 'true');
      filterGroup.append(button);
      return button;
    });
    const extras = el('label', 'extras-toggle');
    const extrasInput = el('input');
    extrasInput.type = 'checkbox';
    extras.append(extrasInput, el('span', '', cfg.showEverythingLabel));
    const count = el('p', 'track-count');
    count.setAttribute('aria-live', 'polite');
    count.setAttribute('aria-atomic', 'true');
    controls.append(filterGroup, extras, count);
    inner.append(controls);

    // the track itself
    const track = el('div', 'track');
    const flagStart = el('div', 'track-flag track-flag-start');
    flagStart.setAttribute('aria-hidden', 'true');
    flagStart.append(el('span', 'track-flag-text', cfg.startLabel));
    const list = el('ol', 'stops');
    list.setAttribute('aria-label', cfg.heading);
    const flagFinish = el('div', 'track-flag track-flag-finish');
    flagFinish.setAttribute('aria-hidden', 'true');
    flagFinish.append(el('span', 'track-flag-text', cfg.finishLabel));
    track.append(flagStart, list, flagFinish);
    inner.append(track);
    mount.append(section);

    const items = timeline
      .filter(item => item.publish === true && isFilled(item.title) && isFilled(item.dateLabel))
      .slice()
      .sort((a, b) => {
        const first = validSortKey(a.date);
        const second = validSortKey(b.date);
        if (first === null) return second === null ? 0 : 1;
        if (second === null) return -1;
        return first.localeCompare(second);
      });
    const stops = items.map(item => renderStop(item, cfg));

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayText = `${cfg.todayLabel}, ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    const todayMarker = el('li', 'today');
    todayMarker.append(el('span', 'today-text', todayText));

    let activeCategory = 'all';
    function update() {
      const visible = stops.filter((stop, index) => {
        const item = items[index];
        const show = (activeCategory === 'all' || item.category === activeCategory) && (extrasInput.checked || item.tier === 'core');
        stop.hidden = !show;
        return show;
      });
      list.replaceChildren();
      let placed = false;
      visible.forEach(stop => {
        const key = validSortKey(stop.dataset.date);
        if (!placed && key && key > currentMonth) {
          list.append(todayMarker);
          placed = true;
        }
        list.append(stop);
      });
      if (!placed) list.append(todayMarker);
      count.textContent = `${visible.length} ${visible.length === 1 ? cfg.countLabelSingular : cfg.countLabelPlural}`;
      raceTrack.relayout();
    }

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.filter;
        filterButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        update();
      });
    });
    extrasInput.addEventListener('change', update);

    const raceTrack = createRaceTrack(track, list, cfg);
    update();
  }

  /*
    The race track: a winding road drawn down the left edge of the timeline.
    A small open-wheel car follows the road as you scroll. Every stop is a checkpoint
    that lights up once the car passes it. Past today, the road turns into a dotted
    "not built yet" line.
  */
  function createRaceTrack(track, list, cfg) {
    const root = svg('svg', { class: 'track-svg', 'aria-hidden': 'true', focusable: 'false' });
    const kerb = svg('path', { class: 'road-kerb' });
    const kerbStripes = svg('path', { class: 'road-kerb-stripes' });
    const roadPast = svg('path', { class: 'road-past' });
    const roadFuture = svg('path', { class: 'road-future' });
    const centerLine = svg('path', { class: 'road-center' });
    const trail = svg('path', { class: 'road-trail' });
    const checkpoints = svg('g', { class: 'checkpoints' });
    const car = buildCar();
    root.append(kerb, kerbStripes, roadPast, roadFuture, centerLine, trail, checkpoints, car);
    track.prepend(root);

    const hud = document.querySelector('[data-hud]');
    const hudDate = document.querySelector('[data-hud-date]');
    const hudYear = document.querySelector('[data-hud-year]');
    const hudTitle = document.querySelector('[data-hud-title]');
    const hudFill = document.querySelector('[data-hud-fill]');
    const hudSpeed = document.querySelector('[data-hud-speed]');
    document.querySelector('[data-hud-label]').textContent = cfg.hudLabel;

    let samples = [];     // points along the road: { x, y, len }
    let totalLength = 0;
    let height = 0;
    let todayY = 0;
    let marks = [];       // { y, stop, dot }
    let carY = 0;
    let targetY = 0;
    let speed = 0;
    let lastScroll = window.scrollY;
    let lastTime = performance.now();
    let frame = 0;
    let relayoutQueued = false;
    let carScale = 1;

    function gutter() {
      return parseFloat(getComputedStyle(track).getPropertyValue('--gutter')) || 96;
    }

    // x position of the road at height y: a sine wave that eases in at the start and out at the finish.
    function roadX(y, center, amplitude, period) {
      const ease = Math.min(1, y / 140, (height - y) / 140);
      const fade = Math.max(0, ease);
      return center + amplitude * fade * Math.sin((2 * Math.PI * y) / period);
    }

    function pathFrom(points) {
      return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    }

    function pointAt(y) {
      if (!samples.length) return { x: 0, y: 0, len: 0, angle: 0 };
      const clamped = Math.max(0, Math.min(height, y));
      let i = samples.findIndex(p => p.y >= clamped);
      if (i <= 0) i = 1;
      const a = samples[i - 1];
      const b = samples[Math.min(i, samples.length - 1)];
      const t = b.y === a.y ? 0 : (clamped - a.y) / (b.y - a.y);
      const x = a.x + (b.x - a.x) * t;
      const len = a.len + (b.len - a.len) * t;
      const angle = (-Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI;
      return { x, y: clamped, len, angle };
    }

    function relayout() {
      if (relayoutQueued) return;
      relayoutQueued = true;
      requestAnimationFrame(() => {
        relayoutQueued = false;
        layout();
      });
    }

    function layout() {
      const g = gutter();
      height = track.offsetHeight;
      root.setAttribute('viewBox', `0 0 ${g} ${height}`);
      root.setAttribute('width', g);
      root.setAttribute('height', height);

      carScale = g >= 100 ? 1.35 : 1;
      const center = g * 0.48;
      const amplitude = g * 0.24;
      const period = g < 80 ? 420 : 560;
      samples = [];
      totalLength = 0;
      for (let y = 0; y <= height; y += 6) {
        const x = roadX(y, center, amplitude, period);
        const prev = samples[samples.length - 1];
        if (prev) totalLength += Math.hypot(x - prev.x, y - prev.y);
        samples.push({ x, y, len: totalLength });
      }
      const last = samples[samples.length - 1];
      if (last && last.y < height) {
        const x = roadX(height, center, amplitude, period);
        totalLength += Math.hypot(x - last.x, height - last.y);
        samples.push({ x, y: height, len: totalLength });
      }

      const trackTop = track.getBoundingClientRect().top;
      const today = list.querySelector('.today');
      todayY = today ? today.getBoundingClientRect().top - trackTop + today.offsetHeight / 2 : height;

      const past = samples.filter(p => p.y <= todayY);
      const future = samples.filter(p => p.y >= todayY);
      const full = pathFrom(samples);
      kerb.setAttribute('d', pathFrom(past));
      kerbStripes.setAttribute('d', pathFrom(past));
      roadPast.setAttribute('d', pathFrom(past));
      roadFuture.setAttribute('d', future.length > 1 ? pathFrom(future) : '');
      centerLine.setAttribute('d', pathFrom(past));
      trail.setAttribute('d', full);
      trail.style.strokeDasharray = `${totalLength} ${totalLength}`;

      checkpoints.replaceChildren();
      marks = [];
      list.querySelectorAll('.stop:not([hidden])').forEach(stop => {
        const y = stop.getBoundingClientRect().top - trackTop + 30;
        const p = pointAt(y);
        const group = svg('g', { class: `checkpoint ${categoryClass(stop.dataset.category)} status-${stop.className.match(/status-([\w-]+)/)?.[1] || 'done'}` });
        group.append(
          svg('line', { class: 'checkpoint-tick', x1: (p.x + 10).toFixed(1), y1: y.toFixed(1), x2: g.toFixed(1), y2: y.toFixed(1) }),
          svg('circle', { class: 'checkpoint-pulse', cx: p.x.toFixed(1), cy: y.toFixed(1), r: 8 }),
          svg('circle', { class: 'checkpoint-dot', cx: p.x.toFixed(1), cy: y.toFixed(1), r: 7 })
        );
        checkpoints.append(group);
        marks.push({ y, stop, dot: group });
      });

      if (reduceMotion.matches) carY = todayY;
      targetY = computeTarget();
      if (reduceMotion.matches) targetY = todayY;
      draw(true);
    }

    function computeTarget() {
      const rect = track.getBoundingClientRect();
      return Math.max(0, Math.min(height, window.innerHeight * 0.55 - rect.top));
    }

    function draw(force) {
      const p = pointAt(carY);
      car.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.angle.toFixed(2)}) scale(${carScale})`);
      trail.style.strokeDashoffset = String(totalLength - p.len);

      let current = null;
      marks.forEach(mark => {
        const passed = mark.y <= carY + 2;
        mark.dot.classList.toggle('is-passed', passed);
        mark.stop.classList.toggle('is-passed', passed);
        if (passed) current = mark;
      });
      if (current || force) {
        const source = current ? current.stop : marks[0]?.stop;
        if (source) {
          hudDate.textContent = source.dataset.dateLabel;
          hudYear.textContent = (source.dataset.dateLabel.match(/\d{4}/) || [source.dataset.dateLabel])[0];
          hudTitle.textContent = source.dataset.title;
        }
      }
      hudFill.style.transform = `scaleX(${height ? (carY / height).toFixed(3) : 0})`;
      hudSpeed.textContent = String(Math.round(speed));
    }

    function tick(now) {
      frame = 0;
      const dt = Math.max(1, now - lastTime);
      const scroll = window.scrollY;
      const instant = Math.min(320, (Math.abs(scroll - lastScroll) / dt) * 110);
      speed += (instant - speed) * 0.2;
      lastScroll = scroll;
      lastTime = now;

      targetY = computeTarget();
      carY += (targetY - carY) * 0.16;
      if (Math.abs(targetY - carY) < 0.3) carY = targetY;
      draw(false);
      if (Math.abs(targetY - carY) > 0.3 || speed > 0.5) {
        frame = requestAnimationFrame(tick);
      } else {
        speed = 0;
        hudSpeed.textContent = '0';
      }
    }

    function onScroll() {
      if (reduceMotion.matches) return;
      if (!frame) {
        lastTime = performance.now();
        frame = requestAnimationFrame(tick);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    new ResizeObserver(relayout).observe(track);
    reduceMotion.addEventListener('change', relayout);

    // Show the dashboard readout only while the track is on screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries.forEach(entry => hud.classList.toggle('is-visible', entry.isIntersecting));
      }, { rootMargin: '-35% 0px -35% 0px' }).observe(track);
    }

    return { relayout };
  }

  // A top-down open-wheel race car, nose pointing down the track.
  function buildCar() {
    const outer = svg('g', { class: 'car' });
    const body = svg('g', { transform: 'translate(-13 -25)' });
    body.append(
      svg('ellipse', { class: 'car-shadow', cx: 13, cy: 27, rx: 13, ry: 24 }),
      svg('rect', { class: 'car-wing', x: 1, y: 0, width: 24, height: 5, rx: 1.5 }),
      svg('rect', { class: 'car-tyre', x: -1, y: 7, width: 7, height: 12, rx: 2.5 }),
      svg('rect', { class: 'car-tyre', x: 20, y: 7, width: 7, height: 12, rx: 2.5 }),
      svg('path', { class: 'car-body', d: 'M8 4 H18 L21.5 13 V27 L16.5 33 L15.4 44 Q13 49 10.6 44 L9.5 33 L4.5 27 V13 Z' }),
      svg('rect', { class: 'car-stripe', x: 12, y: 5, width: 2, height: 38, rx: 1 }),
      svg('rect', { class: 'car-tyre', x: 0, y: 32, width: 6, height: 10, rx: 2.5 }),
      svg('rect', { class: 'car-tyre', x: 20, y: 32, width: 6, height: 10, rx: 2.5 }),
      svg('rect', { class: 'car-wing', x: 3, y: 43, width: 20, height: 4, rx: 1.5 }),
      svg('ellipse', { class: 'car-cockpit', cx: 13, cy: 21, rx: 3.6, ry: 5.6 }),
      svg('circle', { class: 'car-helmet', cx: 13, cy: 20.5, r: 2.6 })
    );
    outer.append(body);
    return outer;
  }

  // ---------- games ----------
  function renderGames(mount, games) {
    const { section, inner } = sectionShell('games', games.title, 'games');
    inner.append(el('p', 'section-intro', games.intro));

    const steps = el('ol', 'steps');
    games.steps.forEach((step, index) => {
      const li = el('li', 'step');
      li.append(el('span', 'step-number', String(index + 1)), el('strong', 'step-title', step.title), el('span', 'step-text', step.text));
      li.firstChild.setAttribute('aria-hidden', 'true');
      steps.append(li);
    });
    inner.append(steps);

    const grid = el('div', 'game-grid');
    // the first two games get the big cards; the rest sit three to a row
    games.items.filter(game => game.publish).forEach((game, index) => {
      const playable = isSafeHref(game.playUrl);
      const featured = index < 2;
      const card = el('article', `game ${categoryClass(game.category)} ${playable ? 'game-playable' : 'game-party'} ${featured ? 'game-feature' : 'game-compact'}`);
      card.setAttribute('aria-labelledby', `game-${game.id}`);
      const icon = el('img', 'game-icon');
      icon.src = game.icon;
      icon.alt = '';
      icon.width = featured ? 88 : 56;
      icon.height = featured ? 88 : 56;
      icon.loading = 'lazy';
      const name = el('h3', 'game-name', game.name);
      name.id = `game-${game.id}`;
      const text = el('div', 'game-text');
      text.append(name, el('p', 'game-tagline', game.tagline), el('p', 'game-description', game.description));
      card.append(icon, text);

      if (playable) {
        text.append(el('p', 'game-note', game.soloNote));
        const actions = el('div', 'game-actions');
        const play = el('button', 'btn btn-solid', `${games.playLabel} ${game.playName || game.name}`);
        play.type = 'button';
        play.addEventListener('click', () => openCabinet(game, games));
        const newTab = el('a', 'btn btn-outline', games.newTabLabel);
        newTab.href = game.playUrl;
        newTab.target = '_blank';
        newTab.rel = 'noopener';
        newTab.setAttribute('aria-label', `${games.newTabLabel}: ${game.playName || game.name}`);
        actions.append(play, newTab);
        text.append(actions);
      } else {
        text.append(el('p', 'game-note', games.partyOnlyLabel));
      }
      grid.append(card);
    });
    inner.append(grid);
    mount.append(section);
  }

  // The in-page game player. The game loads only when it's opened and is removed on close.
  const cabinet = document.querySelector('[data-cabinet]');
  const cabinetScreen = document.querySelector('[data-cabinet-screen]');
  let cabinetOpener = null;

  function openCabinet(game, games) {
    cabinetOpener = document.activeElement;
    document.querySelector('[data-cabinet-title]').textContent = game.playName || game.name;
    const newTab = document.querySelector('[data-cabinet-newtab]');
    newTab.href = game.playUrl;
    newTab.textContent = games.newTabLabel;
    document.querySelector('[data-cabinet-close]').textContent = games.closeLabel;
    const frame = el('iframe', 'cabinet-frame');
    frame.title = game.playName || game.name;
    frame.src = game.playUrl;
    frame.addEventListener('load', () => frame.focus());
    cabinetScreen.replaceChildren(frame);
    cabinet.showModal();
  }

  function closeCabinet() {
    if (cabinet.open) cabinet.close();
  }

  cabinet.addEventListener('close', () => {
    cabinetScreen.replaceChildren();
    if (cabinetOpener && typeof cabinetOpener.focus === 'function') cabinetOpener.focus();
  });
  cabinet.addEventListener('click', event => { if (event.target === cabinet) closeCabinet(); });
  document.querySelector('[data-cabinet-close]').addEventListener('click', closeCabinet);

  // ---------- off the clock ----------
  function renderOffTheClock(mount, data) {
    const { section, inner } = sectionShell('off-the-clock', data.title, 'off');
    const grid = el('div', 'interests');
    data.interests.filter(item => isFilled(item.title) && isFilled(item.text)).forEach(item => {
      const tile = el('article', `interest ${categoryClass(item.category)}`);
      const shape = el('span', `interest-shape shape-${item.shape}`);
      shape.setAttribute('aria-hidden', 'true');
      tile.append(shape, el('h3', 'interest-title', item.title), el('p', 'interest-text', item.text));
      grid.append(tile);
    });
    inner.append(grid);
    if (data.roots) inner.append(renderRoots(data.roots));
    mount.append(section);
  }

  function renderRoots(roots) {
    const card = el('article', 'roots');
    card.setAttribute('aria-labelledby', 'roots-title');
    const text = el('div', 'roots-text');
    const title = el('h3', 'roots-title', roots.title);
    title.id = 'roots-title';
    const clocks = el('p', 'roots-clocks');
    const home = el('span', 'roots-clock roots-home');
    const away = el('span', 'roots-clock roots-away');
    clocks.append(home, away);
    text.append(title, el('p', '', roots.text), clocks);

    const watch = svg('svg', { class: 'watch', viewBox: '0 0 120 120', role: 'img', 'aria-label': roots.watchLabel });
    watch.append(svg('circle', { class: 'watch-case', cx: 60, cy: 60, r: 57 }));
    watch.append(svg('circle', { class: 'watch-face', cx: 60, cy: 60, r: 50 }));
    for (let i = 0; i < 60; i += 1) {
      const major = i % 5 === 0;
      const angle = (i * Math.PI) / 30;
      const r1 = major ? 41 : 45;
      watch.append(svg('line', {
        class: major ? 'watch-tick watch-tick-major' : 'watch-tick',
        x1: (60 + r1 * Math.sin(angle)).toFixed(2), y1: (60 - r1 * Math.cos(angle)).toFixed(2),
        x2: (60 + 48 * Math.sin(angle)).toFixed(2), y2: (60 - 48 * Math.cos(angle)).toFixed(2)
      }));
    }
    const awayHand = svg('g', { class: 'watch-hand watch-away' });
    awayHand.append(svg('line', { x1: 60, y1: 66, x2: 60, y2: 24 }), svg('path', { d: 'M60 16 L64.5 25 H55.5 Z' }));
    const hourHand = svg('line', { class: 'watch-hand watch-hour', x1: 60, y1: 66, x2: 60, y2: 33 });
    const minuteHand = svg('line', { class: 'watch-hand watch-minute', x1: 60, y1: 68, x2: 60, y2: 17 });
    const secondHand = svg('line', { class: 'watch-hand watch-second', x1: 60, y1: 72, x2: 60, y2: 14 });
    watch.append(awayHand, hourHand, minuteHand, secondHand, svg('circle', { class: 'watch-pin', cx: 60, cy: 60, r: 3.2 }));

    function zoneParts(timeZone, date) {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(date);
      const get = type => Number(parts.find(part => part.type === type)?.value || 0);
      return { h: get('hour'), m: get('minute'), s: get('second') };
    }
    function label(timeZone, date) {
      return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
    }
    function setHand(node, degrees) {
      node.setAttribute('transform', `rotate(${degrees.toFixed(2)} 60 60)`);
    }
    function tickWatch() {
      const now = new Date();
      const h = zoneParts(roots.home.timeZone, now);
      const a = zoneParts(roots.away.timeZone, now);
      setHand(hourHand, ((h.h % 12) + h.m / 60) * 30);
      setHand(minuteHand, (h.m + h.s / 60) * 6);
      setHand(secondHand, h.s * 6);
      setHand(awayHand, ((a.h % 12) + a.m / 60) * 30);
      home.textContent = `${roots.home.label} ${label(roots.home.timeZone, now)}`;
      away.textContent = `${roots.away.label} ${label(roots.away.timeZone, now)}`;
    }
    tickWatch();
    secondHand.classList.toggle('is-hidden', reduceMotion.matches);
    window.setInterval(tickWatch, reduceMotion.matches ? 30000 : 1000);

    card.append(watch, text);
    return card;
  }

  // ---------- contact and footer ----------
  function renderContact(mount, contact, education) {
    const { section, inner } = sectionShell('contact', contact.heading, 'contact');
    const panel = renderContactPanel(contact, '');
    const school = el('p', 'contact-school', `${education.institution}, ${education.degree}, ${education.graduation}. ${education.gpa}, ${education.recognition}.`);
    panel.append(school);
    inner.append(panel);
    mount.append(section);
  }

  function renderFooter(site) {
    // Closed timeline stops would print as titles only, so open them for printing and restore afterwards.
    let closedForPrint = [];
    renderSharedFooter(site, {
      open() {
        closedForPrint = [...document.querySelectorAll('details.stop-body:not([open])')];
        closedForPrint.forEach(details => { details.open = true; });
      },
      close() {
        closedForPrint.forEach(details => { details.open = false; });
        closedForPrint = [];
      }
    });
  }

  // ---------- section highlighting in the nav ----------
  function observeSections() {
    if (!('IntersectionObserver' in window)) return;
    const links = document.querySelectorAll('[data-primary-nav] a');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          const current = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', current);
          if (current) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
  }

  // ---------- start ----------
  async function start() {
    const main = document.querySelector('#content');
    try {
      const content = await loadContent('');
      const site = content.site;

      document.title = site.title;
      document.querySelector('meta[name="description"]').content = site.description;
      document.querySelector('meta[property="og:title"]').content = site.title;
      document.querySelector('meta[property="og:description"]').content = site.description;
      document.querySelector('[data-skip-link]').textContent = site.controls.skipToContent;

      renderNavigation(site, '', null);
      setupTheme(site.controls);
      setupEmailCopy(site.controls);

      const mount = document.querySelector('[data-site-content]');
      renderHero(mount, site);
      renderAbout(mount, site.about);
      renderProjects(mount, site, publishedProjects(content));
      renderTrack(mount, site.timelineSection, content.timeline);
      renderGames(mount, site.games);
      renderOffTheClock(mount, site.offTheClock);
      renderContact(mount, site.contact, site.education);
      renderFooter(site);
      observeSections();

      // If the page was opened with a #section in the address, jump there now that it exists.
      if (location.hash.length > 1) {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
      }
    } catch (error) {
      console.error(error);
      renderLoadError(document.querySelector('[data-site-content]'), '');
    } finally {
      main.setAttribute('aria-busy', 'false');
    }
  }

  start();
})();
