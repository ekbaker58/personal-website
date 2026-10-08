/*
  Ethan Baker — personal site
  Builds one project page (projects/<id>/index.html) from the "projects" list in site-content.json.
  The page's <body data-project="<id>"> says which project to show.
  Helpers shared with the home page are in common.js.
*/
(() => {
  'use strict';

  const {
    el, isFilled, categoryClass, resolveHref, setupTheme, setupEmailCopy, renderNavigation, publishedProjects,
    projectHref, usablePhotos, statusLabel, renderProjectCard, renderContactPanel, renderFooter,
    renderLoadError, loadContent
  } = window.EB;

  // Project pages sit two folders below the home page.
  const ROOT = '../../';

  function renderPhoto(photo, cfg, className) {
    const figure = el('figure', className);
    const link = el('a', 'project-photo-link');
    link.href = resolveHref(photo.src, ROOT);
    link.setAttribute('aria-label', `${cfg.openPhotoLabel}: ${photo.alt}`);
    const img = el('img');
    img.src = resolveHref(photo.src, ROOT);
    img.alt = photo.alt;
    img.decoding = 'async';
    if (className !== 'project-cover') img.loading = 'lazy';
    link.append(img);
    figure.append(link);
    if (isFilled(photo.caption)) figure.append(el('figcaption', '', photo.caption));
    return figure;
  }

  function renderHeader(mount, project, site) {
    const cfg = site.projectsSection;
    const header = el('header', `project-hero ${categoryClass(project.category)}`);
    const inner = el('div', 'wrap');

    const back = el('a', 'project-back', cfg.backLabel);
    back.href = `${ROOT}#projects`;
    inner.append(back);

    if (isFilled(project.eyebrow)) inner.append(el('p', 'project-eyebrow', project.eyebrow));
    const title = el('h1', 'project-title', project.title);
    title.id = 'project-title';
    inner.append(title);

    const meta = el('p', 'project-meta');
    if (project.status) meta.append(el('span', `chip status-${project.status}`, statusLabel(site, project.status)));
    if (isFilled(project.dateLabel)) meta.append(el('span', 'project-date', project.dateLabel));
    inner.append(meta);
    inner.append(el('p', 'project-summary', project.summary));

    header.append(inner);
    mount.append(header);
  }

  function renderSections(project) {
    const story = el('div', 'project-story');
    (project.sections || []).filter(part => isFilled(part.heading)).forEach(part => {
      const block = el('section', 'project-section');
      const heading = el('h2', 'project-section-title', part.heading);
      block.append(heading);
      (part.paragraphs || []).filter(isFilled).forEach(text => block.append(el('p', '', text)));
      const bullets = (part.bullets || []).filter(isFilled);
      if (bullets.length) {
        const ul = el('ul', 'project-bullets');
        bullets.forEach(text => ul.append(el('li', '', text)));
        block.append(ul);
      }
      story.append(block);
    });
    return story;
  }

  function renderAside(project, cfg) {
    const aside = el('aside', 'project-aside');
    const facts = (project.facts || []).filter(fact => isFilled(fact.label) && isFilled(fact.value));
    if (facts.length) {
      const spec = el('div', 'spec');
      const title = el('h2', 'spec-title', cfg.factsTitle);
      const list = el('dl', 'spec-list');
      facts.forEach(fact => {
        const row = el('div', 'spec-row');
        row.append(el('dt', '', fact.label), el('dd', '', fact.value));
        list.append(row);
      });
      spec.append(title, list);
      aside.append(spec);
    }
    const results = (project.results || []).filter(item => isFilled(item.value) && isFilled(item.label));
    if (results.length) {
      const tower = el('div', `tower ${categoryClass(project.category)}`);
      const title = el('h2', 'tower-title', cfg.resultsTitle);
      const list = el('ol', 'tower-list');
      results.forEach(item => {
        const row = el('li', `tower-row ${categoryClass(project.category)}`);
        row.append(el('span', 'tower-value', item.value), el('span', 'tower-label', item.label));
        list.append(row);
      });
      tower.append(title, list);
      aside.append(tower);
    }
    return aside;
  }

  function renderBody(mount, project, site, projects) {
    const cfg = site.projectsSection;
    const photos = usablePhotos(project);
    const body = el('div', `wrap project-body ${categoryClass(project.category)}`);

    if (photos.length) body.append(renderPhoto(photos[0], cfg, 'project-cover'));

    const grid = el('div', 'project-grid-layout');
    grid.append(renderSections(project), renderAside(project, cfg));
    body.append(grid);

    if (photos.length > 1) {
      const gallery = el('section', 'project-gallery');
      gallery.setAttribute('aria-labelledby', 'project-photos-title');
      const title = el('h2', 'project-section-title', cfg.photosTitle);
      title.id = 'project-photos-title';
      const grid2 = el('div', 'project-photos');
      photos.slice(1).forEach(photo => grid2.append(renderPhoto(photo, cfg, 'project-photo')));
      gallery.append(title, grid2);
      body.append(gallery);
    }

    const others = projects.filter(other => other.id !== project.id);
    if (others.length) {
      const more = el('section', 'project-more');
      more.setAttribute('aria-labelledby', 'project-more-title');
      const title = el('h2', 'project-section-title', cfg.moreTitle);
      title.id = 'project-more-title';
      const grid3 = el('div', 'project-grid');
      others.forEach(other => grid3.append(renderProjectCard(other, site, ROOT)));
      more.append(title, grid3);
      body.append(more);
    }

    const contact = el('div', 'project-contact');
    contact.append(renderContactPanel(site.contact, ROOT));
    body.append(contact);

    mount.append(body);
  }

  async function start() {
    const main = document.querySelector('#content');
    const mount = document.querySelector('[data-site-content]');
    const id = document.body.dataset.project;
    try {
      const content = await loadContent(ROOT);
      const site = content.site;
      document.querySelector('[data-skip-link]').textContent = site.controls.skipToContent;
      document.querySelector('[data-brand-link]').href = ROOT;
      renderNavigation(site, ROOT, 'projects');
      setupTheme(site.controls);
      setupEmailCopy(site.controls);

      const projects = publishedProjects(content);
      const project = projects.find(item => item.id === id && projectHref(item) === `projects/${item.id}/`);
      if (!project) {
        const missing = el('div', 'load-error');
        const home = el('a', '', site.projectsSection.backLabel);
        home.href = `${ROOT}#projects`;
        missing.append(el('p', '', site.projectsSection.notFound), home);
        mount.replaceChildren(missing);
      } else {
        document.title = `${project.title} · ${site.title}`;
        renderHeader(mount, project, site);
        renderBody(mount, project, site, projects);
        main.setAttribute('aria-labelledby', 'project-title');
      }
      renderFooter(site);
    } catch (error) {
      console.error(error);
      renderLoadError(mount, ROOT);
    } finally {
      main.setAttribute('aria-busy', 'false');
    }
  }

  start();
})();
