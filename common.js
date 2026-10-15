/*
  Ethan Baker — personal site
  Helpers shared by the home page (script.js) and the project pages (project.js).
  Load this file first. Everything it shares hangs off window.EB.
*/
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const THEME_KEY = 'ethan-baker-theme';
  const CATEGORIES = ['engineering', 'startup', 'leadership', 'education', 'work', 'life'];
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  // A value is shown only if it is real text. Anything containing "TODO" never reaches the page.
  function isFilled(value) {
    return typeof value === 'string' && value.trim() !== '' && !value.includes('TODO');
  }

  // Links: same-page anchors, https pages, mailto, a file in this folder, or a project page (projects/<id>/).
  function isSafeHref(href) {
    if (!isFilled(href)) return false;
    return /^#[\w-]+$/.test(href) || /^https:\/\//.test(href) || /^mailto:[^\s]+$/.test(href) ||
      /^[\w./-]+\.(pdf|html)$/.test(href) || /^projects\/[\w-]+\/$/.test(href);
  }

  // Photos must be files in the images/ folder.
  function isPhotoPath(src) {
    return typeof src === 'string' && /^images\/[\w./-]+\.(jpe?g|png|webp|avif)$/i.test(src) && !src.includes('..');
  }

  function categoryClass(category) {
    return CATEGORIES.includes(category) ? `cat-${category}` : 'cat-engineering';
  }

  // Project pages live two folders down, so links written for the home page need "../../" in front.
  // root is '' on the home page and '../../' on a project page.
  function resolveHref(href, root) {
    if (/^(https:|mailto:)/.test(href)) return href;
    return root + href;
  }

  function isExternal(href) {
    return /^https:\/\//.test(href);
  }

  function setupTheme(controls) {
    const button = document.querySelector('[data-theme-toggle]');
    const text = document.querySelector('[data-theme-text]');
    button.setAttribute('aria-label', controls.themeLabel);

    function apply(theme) {
      document.documentElement.dataset.theme = theme;
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      text.textContent = theme === 'dark' ? controls.lightTheme : controls.darkTheme;
      document.querySelector('#theme-color-meta').content = theme === 'dark' ? '#0b0e2a' : '#f3f4fb';
      document.dispatchEvent(new CustomEvent('themechange'));
    }

    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { saved = null; }
    apply(saved === 'light' || saved === 'dark' ? saved : (prefersDark.matches ? 'dark' : 'light'));

    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem(THEME_KEY, next); } catch { /* theme still applies for this visit */ }
    });
  }

  function renderNavigation(site, root, currentId) {
    const list = document.querySelector('[data-primary-nav]');
    site.navigation.forEach(item => {
      const li = el('li');
      const link = el('a', '', item.label);
      link.href = `${root}#${item.id}`;
      if (item.id === currentId) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
      li.append(link);
      list.append(li);
    });
    document.querySelector('[data-nav]').setAttribute('aria-label', site.navigationLabel);
    // The link's name starts with the visible text, so voice control ("click Ethan Baker") works.
    document.querySelector('[data-brand-name]').textContent = site.hero.name;
    document.querySelector('[data-brand-link]').append(el('span', 'sr-only', root ? ', home page' : ', back to top'));
  }

  // Only published projects with a title and summary are shown anywhere.
  function publishedProjects(content) {
    return (content.projects || []).filter(project => project.publish === true && isFilled(project.title) && isFilled(project.summary));
  }

  // A project either has its own page (projects/<id>/) or points somewhere else on the site with "href".
  function projectHref(project) {
    return isSafeHref(project.href) ? project.href : `projects/${project.id}/`;
  }

  // Videos must be .mp4 files in the images/ folder (H.264, no sound; see NOTES.md).
  function isVideoPath(src) {
    return typeof src === 'string' && /^images\/[\w./-]+\.mp4$/i.test(src) && !src.includes('..');
  }

  // A photo needs a file and alt text. A video entry also has "video": its "src" is the still shown before it plays.
  function usablePhotos(item) {
    return (item.photos || []).filter(photo => isPhotoPath(photo.src) && isFilled(photo.alt) && (!photo.video || isVideoPath(photo.video)));
  }

  // "position" picks which part of a photo stays in view when it's cropped, e.g. "50% 30%" (across, down).
  function applyPosition(img, photo) {
    if (typeof photo.position === 'string' && /^\d{1,3}% \d{1,3}%$/.test(photo.position)) img.style.objectPosition = photo.position;
  }

  // One photo or video with its caption. Photos open full size in a new tab; videos play in place, without sound.
  function renderMedia(photo, root, className, openLabel, lazy = true) {
    const figure = el('figure', className);
    if (photo.video) {
      figure.classList.add('is-video');
      const video = el('video');
      video.src = resolveHref(photo.video, root);
      video.poster = resolveHref(photo.src, root);
      video.controls = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-label', photo.alt);
      figure.append(video);
    } else {
      const link = el('a', 'media-link');
      link.href = resolveHref(photo.src, root);
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', `${openLabel}: ${photo.alt}`);
      const img = el('img');
      img.src = resolveHref(photo.src, root);
      img.alt = photo.alt;
      img.decoding = 'async';
      if (lazy) img.loading = 'lazy';
      applyPosition(img, photo);
      // "fit": "contain" shows the whole photo in the gallery too, instead of cropping it to the tile
      if (photo.fit === 'contain') figure.classList.add('is-contain');
      link.append(img);
      figure.append(link);
    }
    if (isFilled(photo.caption)) figure.append(el('figcaption', '', photo.caption));
    return figure;
  }

  function statusLabel(site, status) {
    return (site.timelineSection.statusLabels || {})[status] || status;
  }

  // Small line icons, drawn here so the site needs no icon files: 24 x 24, stroked in the text color.
  const ICONS = {
    email: ['M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z', 'M3.6 7.2l8.4 6 8.4-6'],
    resume: ['M14 2.75H7.5a2 2 0 0 0-2 2v14.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7.25z', 'M14 2.75v4.5h4.5', 'M8.75 12h6.5', 'M8.75 15h6.5', 'M8.75 18h4'],
    prev: ['M14.5 5.5L8 12l6.5 6.5'],
    next: ['M9.5 5.5L16 12l-6.5 6.5'],
  };
  function icon(name) {
    const node = svg('svg', {
      class: 'icon', viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
    });
    ICONS[name].forEach(d => node.append(svg('path', { d })));
    return node;
  }

  // Email and the résumé show a symbol instead of words; the words stay as the button's name for screen readers
  // and as the tooltip on hover. Other links (LinkedIn) keep their text.
  function contactButton(link, label, root, className) {
    const name = link.href.startsWith('mailto:') ? 'email' : /\.pdf$/i.test(link.href) ? 'resume' : null;
    const a = el('a', `btn ${className}${name ? ' btn-icon' : ''}`, name ? null : label);
    a.href = resolveHref(link.href, root);
    if (name) {
      a.append(icon(name));
      a.setAttribute('aria-label', label);
      a.title = label;
    }
    if (isExternal(link.href)) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function showCoverPhoto(cover, img, photo, root) {
    img.src = resolveHref(photo.src, root);
    img.style.objectPosition = '';
    applyPosition(img, photo);
    // "fit": "contain" shows the whole photo on the card instead of cropping it (good for tall product shots).
    cover.classList.toggle('is-contain', photo.fit === 'contain');
  }

  // Arrows on a card's cover flip through all of that project's photos without leaving the page.
  // They sit above the card's link, so tapping one changes the photo instead of opening the project.
  function addCoverArrows(cover, img, photos, project, site, root) {
    const cfg = site.projectsSection;
    let index = 0;
    const count = el('span', 'card-photo-count');
    count.setAttribute('aria-hidden', 'true');
    const status = el('span', 'sr-only');
    status.setAttribute('aria-live', 'polite');
    const preload = i => { const pic = new Image(); pic.src = resolveHref(photos[i].src, root); return pic; };
    const setCount = () => { count.textContent = `${index + 1} / ${photos.length}`; };
    const go = step => {
      index = (index + step + photos.length) % photos.length;
      const target = index;
      setCount();
      status.textContent = cfg.photoCountLabel.replace('{n}', index + 1).replace('{total}', photos.length);
      const pic = preload(target);
      // swap once the next photo is ready, so the card never flashes empty
      (pic.decode ? pic.decode() : Promise.resolve()).catch(() => {}).then(() => {
        if (target !== index) return;
        showCoverPhoto(cover, img, photos[target], root);
        img.alt = photos[target].alt;
      });
      preload((index + step + photos.length) % photos.length);
    };
    [['prev', -1, cfg.photoPrevLabel], ['next', 1, cfg.photoNextLabel]].forEach(([name, step, label]) => {
      const button = el('button', `card-photo-btn card-photo-${name}`);
      button.type = 'button';
      button.setAttribute('aria-label', `${label}: ${project.title}`);
      button.append(icon(name));
      button.addEventListener('click', () => go(step));
      cover.append(button);
    });
    // get the second photo ready as soon as someone shows interest in the card
    cover.addEventListener('pointerenter', () => preload(1), { once: true });
    setCount();
    cover.append(count, status);
  }

  // Project cards in one sideways row: swipe on a phone, or use the arrows. It saves a long scroll down the page.
  let sliderCount = 0;
  function renderProjectSlider(projects, site, root, headingTag) {
    const cfg = site.projectsSection;
    const slider = el('div', 'project-slider');
    const rail = el('div', 'project-rail');
    rail.id = `project-rail-${++sliderCount}`;
    projects.forEach(project => rail.append(renderProjectCard(project, site, root, headingTag)));

    const bar = el('div', 'slider-bar');
    const dots = el('div', 'slider-dots');
    dots.setAttribute('aria-hidden', 'true');
    projects.forEach(() => dots.append(el('span')));
    const arrows = el('div', 'slider-arrows');
    const buttons = [['prev', -1, cfg.prevLabel], ['next', 1, cfg.nextLabel]].map(([name, direction, label]) => {
      const button = el('button', 'slider-btn');
      button.type = 'button';
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-controls', rail.id);
      button.append(icon(name));
      button.addEventListener('click', () => {
        const card = rail.firstElementChild;
        const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: smooth ? 'smooth' : 'auto' });
      });
      arrows.append(button);
      return button;
    });
    bar.append(dots, arrows);

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      slider.classList.toggle('is-static', max <= 2);        // everything fits: no arrows needed
      buttons[0].disabled = rail.scrollLeft <= 2;
      buttons[1].disabled = rail.scrollLeft >= max - 2;
      const box = rail.getBoundingClientRect();
      [...rail.children].forEach((card, i) => {
        const c = card.getBoundingClientRect();
        dots.children[i].classList.toggle('is-on', c.left >= box.left - c.width * 0.4 && c.right <= box.right + c.width * 0.4);
      });
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    rail.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    requestAnimationFrame(update);

    slider.append(bar, rail);
    return slider;
  }

  // The card used in the Projects section and under "More projects".
  function renderProjectCard(project, site, root, headingTag = 'h3') {
    const card = el('article', `project-card ${categoryClass(project.category)}`);
    const headingId = `project-card-${project.id}`;
    card.setAttribute('aria-labelledby', headingId);

    const cover = el('div', 'project-card-cover');
    const photos = usablePhotos(project);
    if (photos.length) {
      const img = el('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      showCoverPhoto(cover, img, photos[0], root);
      cover.append(img);
      if (photos.length > 1) addCoverArrows(cover, img, photos, project, site, root);
    } else {
      // No photo yet: show the project's headline result (if it has one) over the livery stripes.
      cover.classList.add('is-blank');
      cover.setAttribute('aria-hidden', 'true');
      cover.append(el('span', 'project-card-band band-a'), el('span', 'project-card-band band-b'));
      const stat = (project.results || []).find(item => isFilled(item.value) && isFilled(item.label));
      if (stat) {
        cover.classList.add('has-stat');
        const box = el('span', 'project-card-stat');
        box.append(el('span', 'project-card-stat-value', stat.value), el('span', 'project-card-stat-label', stat.label));
        cover.append(box);
      }
    }

    const body = el('div', 'project-card-body');
    const meta = el('p', 'project-card-meta');
    if (isFilled(project.dateLabel)) meta.append(el('span', '', project.dateLabel));
    if (project.status) meta.append(el('span', `chip status-${project.status}`, statusLabel(site, project.status)));
    const heading = el(headingTag, 'project-card-title');
    heading.id = headingId;
    const link = el('a', 'project-card-link', project.title);
    link.href = resolveHref(projectHref(project), root);
    heading.append(link);
    const more = el('span', 'project-card-more', project.linkLabel || site.projectsSection.readMoreLabel);
    more.setAttribute('aria-hidden', 'true');
    body.append(meta, heading, el('p', 'project-card-summary', project.summary), more);

    card.append(cover, body);
    return card;
  }

  function emailAddress(href) {
    return decodeURIComponent(href.slice('mailto:'.length).split('?')[0]);
  }

  function renderContactPanel(contact, root) {
    const panel = el('div', 'contact-panel');
    panel.append(el('p', 'contact-title', contact.title), el('p', 'contact-text', contact.text));
    const links = contact.links.filter(link => isSafeHref(link.href));
    if (links.length) {
      const row = el('div', 'contact-links');
      links.forEach((link, index) => row.append(contactButton(link, link.label, root, index === 0 ? 'btn-solid' : 'btn-outline')));
      panel.append(row);
    }
    // The address in plain text too, for anyone whose computer has no email app set up.
    const email = links.find(link => link.href.startsWith('mailto:'));
    if (email && isFilled(contact.addressText)) {
      const line = el('p', 'contact-address');
      const [before, after] = contact.addressText.split('{email}');
      line.append(before || '', el('span', 'contact-address-email', emailAddress(email.href)), after || '');
      panel.append(line);
    }
    return panel;
  }

  // An "Email me" link only works if the visitor's computer has an email app set up. Plenty of people
  // only use Gmail or Outlook in the browser, and for them the click does nothing. So the click also
  // copies the address and says so. The email app still opens if there is one.
  function setupEmailCopy(controls) {
    if (!isFilled(controls.emailCopied)) return;
    const toast = el('p', 'toast');
    toast.setAttribute('role', 'status');
    document.body.append(toast);
    let timer = 0;
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="mailto:"]');
      if (!link || !navigator.clipboard || !window.isSecureContext) return;
      const address = emailAddress(link.getAttribute('href'));
      navigator.clipboard.writeText(address).then(() => {
        toast.textContent = controls.emailCopied.replace('{email}', address);
        toast.classList.add('is-visible');
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          toast.classList.remove('is-visible');
          toast.textContent = '';
        }, 7000);
      }).catch(() => { /* clipboard blocked: the email link still works as a normal link */ });
    });
  }

  function renderFooter(site, beforePrint) {
    const footer = document.querySelector('[data-footer]');
    const inner = el('div', 'wrap footer-inner');
    inner.append(el('p', '', site.footer));
    const print = el('button', 'footer-button', site.controls.printProfile);
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    inner.append(print);
    if (beforePrint) {
      window.addEventListener('beforeprint', beforePrint.open);
      window.addEventListener('afterprint', beforePrint.close);
    }
    footer.append(el('div', 'checker'), inner);
  }

  function renderLoadError(mount, root) {
    const message = el('div', 'load-error');
    message.append(el('p', '', "The site content didn't load."));
    // The setup hint is only for previewing on the Mac; visitors just get a retry.
    if (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      message.append(el('p', '', 'If you opened the page straight from Finder, the browser blocks it from reading site-content.json. In VS Code, open the terminal and run "npm start", then go to http://localhost:8080.'));
    } else {
      message.append(el('p', '', 'Refresh the page to try again.'));
    }
    mount.replaceChildren(message);
  }

  // no-cache: the browser always checks for a newer site-content.json (a quick "not modified" when nothing changed),
  // so an update shows up on a normal refresh.
  async function loadContent(root) {
    const response = await fetch(`${root}site-content.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`site-content.json returned ${response.status}`);
    return response.json();
  }

  window.EB = Object.freeze({
    el, svg, isFilled, isSafeHref, isPhotoPath, isVideoPath, renderMedia, categoryClass, resolveHref, isExternal,
    setupTheme, setupEmailCopy, renderNavigation, publishedProjects, projectHref, usablePhotos, statusLabel,
    renderProjectCard, renderProjectSlider, contactButton, renderContactPanel, renderFooter, renderLoadError, loadContent
  });
})();
