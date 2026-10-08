// Keeps the page <head>s in step with site-content.json.
// Run it from VS Code's terminal after you add or rename a project, or change the site's description:
//   npm run pages
// Moving to your own domain? Give the new address and it updates everything that mentions it:
//   npm run pages -- --url https://yourname.com/
//
// Why this exists: link previews (LinkedIn, iMessage) and search engines read the page's <head>
// without running any JavaScript. So each project page needs its title, description and address
// written into its own HTML file, and index.html needs the same for the home page.
// It also stamps a version on styles.css and the scripts (styles.css?v=1a2b3c4d). Browsers keep
// files for 10 minutes on GitHub Pages; a new version tag makes them fetch the new file right away.
// The words on the pages still come from site-content.json when the page loads.
// Uses only Node's built-in modules, so there is nothing to install.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'site-content.json');

// A short fingerprint of each file, so the version tag changes whenever the file does.
function assetVersions() {
  const versions = {};
  ['styles.css', 'common.js', 'script.js', 'project.js'].forEach(file => {
    versions[file] = crypto.createHash('sha1').update(fs.readFileSync(path.join(ROOT, file))).digest('hex').slice(0, 8);
  });
  return versions;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isFilled(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('TODO');
}

function loadContent() {
  return JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
}

// Projects that get their own page: published, with a title and summary, and no "href" pointing elsewhere.
function projectsWithPages(content) {
  return (content.projects || []).filter(project =>
    project.publish === true && isFilled(project.title) && isFilled(project.summary) && !project.href && /^[\w-]+$/.test(project.id));
}

function readIndex() {
  return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
}

// The project pages use exactly the same security policy as the home page.
function contentSecurityPolicy(indexHtml) {
  const match = indexHtml.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  if (!match) throw new Error('index.html has no Content-Security-Policy meta tag.');
  return match[1];
}

function firstPhoto(project) {
  return (project.photos || []).find(photo =>
    typeof photo.src === 'string' && /^images\/[\w./-]+\.(jpe?g|png|webp)$/i.test(photo.src) && isFilled(photo.alt));
}

function buildProjectPage(project, site, indexHtml) {
  const v = assetVersions();
  const url = `${site.url}projects/${project.id}/`;
  const title = `${project.title} · ${site.title}`;
  const description = isFilled(project.description) ? project.description : project.summary;
  const photo = firstPhoto(project);
  const image = photo
    ? `  <meta property="og:image" content="${escapeHtml(site.url + photo.src)}">\n  <meta property="og:image:alt" content="${escapeHtml(photo.alt)}">`
    : `  <meta property="og:image" content="${escapeHtml(site.url)}og-image.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Made by "npm run pages" from site-content.json. Change the project there, then run npm run pages again. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#f3f4fb" id="theme-color-meta">
  <meta name="color-scheme" content="light dark">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(indexHtml)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
${image}
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../../apple-touch-icon.png">
  <link rel="preload" href="../../fonts/barlow-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../styles.css?v=${v['styles.css']}">
</head>
<body data-project="${escapeHtml(project.id)}">
  <a class="skip" href="#content" data-skip-link>Skip to content</a>

  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="../../" data-brand-link>
        <span class="roundel" aria-hidden="true">EB</span>
        <span class="brand-name" data-brand-name></span>
      </a>
      <nav class="nav" data-nav>
        <ul data-primary-nav></ul>
      </nav>
      <button class="theme-toggle" type="button" aria-pressed="false" data-theme-toggle>
        <span class="theme-icon" aria-hidden="true"></span>
        <span data-theme-text></span>
      </button>
    </div>
  </header>

  <main id="content" aria-busy="true">
    <div data-site-content></div>
    <noscript>
      <div class="load-error">
        <h1>${escapeHtml(project.title)}</h1>
        <p>${escapeHtml(project.summary)}</p>
        <p><a href="../../">${escapeHtml(site.title)}</a></p>
      </div>
    </noscript>
  </main>

  <footer class="footer" data-footer></footer>

  <script src="../../common.js?v=${v['common.js']}" defer></script>
  <script src="../../project.js?v=${v['project.js']}" defer></script>
</body>
</html>
`;
}

// index.html keeps its own copy of the description and the site address for link previews.
function syncIndexHtml(indexHtml, site) {
  const v = assetVersions();
  const swaps = [
    [/(<link rel="stylesheet" href=")styles\.css(?:\?v=\w+)?(">)/, `styles.css?v=${v['styles.css']}`],
    [/(<script src=")common\.js(?:\?v=\w+)?(" defer><\/script>)/, `common.js?v=${v['common.js']}`],
    [/(<script src=")script\.js(?:\?v=\w+)?(" defer><\/script>)/, `script.js?v=${v['script.js']}`],
    [/(<meta name="description" content=")[^"]*(">)/, escapeHtml(site.description)],
    [/(<meta property="og:description" content=")[^"]*(">)/, escapeHtml(site.description)],
    [/(<link rel="canonical" href=")[^"]*(">)/, escapeHtml(site.url)],
    [/(<meta property="og:url" content=")[^"]*(">)/, escapeHtml(site.url)],
    [/(<meta property="og:image" content=")[^"]*(">)/, escapeHtml(`${site.url}og-image.png`)]
  ];
  return swaps.reduce((html, [pattern, value]) => html.replace(pattern, (_, start, end) => `${start}${value}${end}`), indexHtml);
}

function checkUrl(url) {
  return /^https:\/\/[^\s/]+\/([\w.-]+\/)*$/.test(url);
}

function run() {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1) {
    const url = args[urlIndex + 1] || '';
    if (!checkUrl(url)) {
      console.error(`\n  "${url}" isn't a full address. Use the form https://yourname.com/ (with https:// and the slash at the end).\n`);
      process.exit(1);
    }
    const raw = fs.readFileSync(CONTENT, 'utf8');
    const content = JSON.parse(raw);
    content.site.url = url;
    fs.writeFileSync(CONTENT, JSON.stringify(content, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
    console.log(`\n  Site address set to ${url}`);
  }

  const content = loadContent();
  const site = content.site;
  if (!checkUrl(site.url || '')) {
    console.error('\n  site.url in site-content.json should look like https://ekbaker58.github.io/personal-website/ (https:// and a slash at the end).\n');
    process.exit(1);
  }

  const index = readIndex();
  const updatedIndex = syncIndexHtml(index, site);
  if (updatedIndex !== index) {
    fs.writeFileSync(path.join(ROOT, 'index.html'), updatedIndex);
    console.log('  Updated index.html (description, address or file versions)');
  }

  const pages = projectsWithPages(content);
  pages.forEach(project => {
    const folder = path.join(ROOT, 'projects', project.id);
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, 'index.html');
    const html = buildProjectPage(project, site, updatedIndex);
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (before !== html) {
      fs.writeFileSync(file, html);
      console.log(`  ${before === null ? 'Made' : 'Updated'} projects/${project.id}/index.html`);
    }
  });

  // Folders left over from a project you removed or renamed.
  const projectsDir = path.join(ROOT, 'projects');
  if (fs.existsSync(projectsDir)) {
    const keep = new Set(pages.map(project => project.id));
    fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && !keep.has(entry.name))
      .forEach(entry => console.log(`  projects/${entry.name}/ has no published project in site-content.json any more. Delete that folder if you don't need it.`));
  }

  console.log(`\n  ${pages.length} project page${pages.length === 1 ? '' : 's'} up to date. Run npm run check before you publish.\n`);
}

module.exports = { loadContent, projectsWithPages, buildProjectPage, syncIndexHtml, readIndex, checkUrl, firstPhoto };

if (require.main === module) run();
