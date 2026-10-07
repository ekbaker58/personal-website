// Pre-publish check for the personal website.
// Run it from VS Code's terminal before you upload the site:  npm run check
//
// Why this exists: site-content.json is uploaded with the site, so anyone can open
// yoursite.com/site-content.json and read all of it, including text the page never shows.
// This makes sure nothing private is in it, the contact buttons will show up, and the
// private files stay on your Mac. Uses only Node's built-in modules, so there is nothing to install.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRIVATE_FILES = ['NOTES.md', 'site-content-private.md', 'ethan-site-brief.md', '_old-version-*/', '.claude/'];

const problems = [];  // fix these before publishing
const warnings = [];  // worth a look
const passed = [];

// Same rule as isSafeHref() in script.js: the site only shows links that pass it.
function isSafeHref(href) {
  if (typeof href !== 'string' || href.trim() === '' || href.includes('TODO')) return false;
  return /^#[\w-]+$/.test(href) || /^https:\/\//.test(href) || /^mailto:[^\s]+$/.test(href) || /^[\w./-]+\.(pdf|html)$/.test(href);
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

let content;
const raw = fs.readFileSync(path.join(ROOT, 'site-content.json'), 'utf8');
try {
  content = JSON.parse(raw);
} catch (error) {
  // Point at the line, since a missing or extra comma is the usual cause.
  const position = Number((error.message.match(/position (\d+)/) || [])[1]);
  const line = Number.isFinite(position) ? raw.slice(0, position).split('\n').length : null;
  console.error(`\n  site-content.json has a typo${line ? ` on or just before line ${line}` : ''}, so the site can't load it.`);
  console.error(`  (${error.message}) Usually it's a missing or extra comma, or a missing quote.\n`);
  process.exit(1);
}
const site = content.site || {};
const timeline = content.timeline || [];

// ---------- nothing private in site-content.json ----------
const privateBefore = problems.length;
const contactLinks = (site.contact && site.contact.links) || [];

// Finds todo notes and TODO placeholders. Contact links are checked separately below, with clearer messages.
function walk(value, where) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${where}[${index}]`));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      if (key !== 'todo') walk(child, `${where}.${key}`);
      else if (child) problems.push(`${where}.todo is a private note. Move it to site-content-private.md.`);
    });
  } else if (typeof value === 'string' && value.includes('TODO') && !/^site\.contact\.links\[\d+\]\.href$/.test(where)) {
    problems.push(`${where} still says "${value}". Fill it in, or move it to site-content-private.md.`);
  }
}
walk(site, 'site');

timeline.forEach(item => {
  const name = `Timeline entry "${item.id}"`;
  if (item.publish !== true) {
    problems.push(`${name} isn't published ("publish": ${JSON.stringify(item.publish)}), but anyone can still read it in the file. Move it to site-content-private.md.`);
    return;
  }
  walk(item, `timeline[id=${item.id}]`);
  if (item.holdDetails) {
    const hasSummary = typeof item.summary === 'string' && item.summary.trim() !== '';
    const hasDetails = Array.isArray(item.details) && item.details.length > 0;
    if (hasSummary || hasDetails) {
      problems.push(`${name} is on hold ("holdDetails": true), but its summary or details are still in the file. Keep that text in site-content-private.md until you have the OK.`);
    }
  }
});

if (problems.length === privateBefore) {
  passed.push('Nothing private in site-content.json (no todo notes, unpublished entries or held-back text)');
}

// ---------- contact buttons ----------
const contactBefore = problems.length;
const examples = { 0: 'mailto:you@example.com', 1: 'https://www.linkedin.com/in/your-name', 2: 'resume.pdf' };
if (!contactLinks.length) {
  problems.push('site-content.json has no contact links, so recruiters have no way to reach you.');
}
contactLinks.forEach((link, index) => {
  const label = `"${link.label}" (site.contact.links[${index}].href)`;
  if (typeof link.href !== 'string' || link.href.includes('TODO') || link.href.trim() === '') {
    problems.push(`Add your link for ${label}. Example: ${examples[index] || 'https://...'}`);
  } else if (!isSafeHref(link.href)) {
    problems.push(`${label} is "${link.href}", which the site won't show. Use mailto:..., https://..., or a PDF in the website folder.`);
  } else if (/^[\w./-]+\.(pdf|html)$/.test(link.href) && !exists(link.href)) {
    problems.push(`${label} points to ${link.href}, but that file isn't in the website folder yet.`);
  } else if (/^mailto:.*\.edu$/i.test(link.href)) {
    warnings.push(`${label} is a school address. A dedicated contact email keeps working after you graduate.`);
  }
});
if (problems.length === contactBefore) passed.push('Contact buttons are filled in');

// ---------- games ----------
const gamesBefore = problems.length;
const games = ((site.games && site.games.items) || []).filter(game => game.publish);
games.forEach(game => {
  if (game.icon && !exists(game.icon)) problems.push(`The ${game.name} icon (${game.icon}) is missing. Run npm run sync-games.`);
  if (game.playUrl && !exists(game.playUrl)) problems.push(`${game.name} (${game.playUrl}) is missing. Run npm run sync-games.`);
  if (game.playUrl && exists(game.playUrl)) {
    const page = fs.readFileSync(path.join(ROOT, game.playUrl), 'utf8');
    if (/fonts\.(googleapis|gstatic)\.com/.test(page)) {
      warnings.push(`${game.playUrl} loads fonts from Google, so players contact Google's servers. Run npm run sync-games to switch it to the site's own fonts.`);
    }
  }
});
if (games.length && problems.length === gamesBefore) passed.push('Game files are all there');

// ---------- link previews ----------
// LinkedIn and iMessage previews don't run script.js, so index.html carries its own copy of the description.
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const metaDescription = (indexHtml.match(/<meta name="description" content="([^"]*)">/) || [])[1];
const ogDescription = (indexHtml.match(/<meta property="og:description" content="([^"]*)">/) || [])[1];
if (metaDescription !== site.description || ogDescription !== site.description) {
  warnings.push('The description in index.html doesn\'t match "description" in site-content.json. Link previews (LinkedIn, iMessage) show the one in index.html, so copy it into both <meta name="description"> and <meta property="og:description">.');
}

// ---------- private files stay on your Mac ----------
let ignored = [];
try {
  ignored = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split('\n').map(line => line.trim());
} catch {
  ignored = [];
}
const notIgnored = PRIVATE_FILES.filter(file => !ignored.includes(file));
if (notIgnored.length) {
  notIgnored.forEach(file => problems.push(`${file} isn't in .gitignore, so it would be uploaded with the site. Add it on its own line.`));
} else {
  passed.push('Private files are in .gitignore (notes, brief, private content, backups, Claude Code settings)');
}

// ---------- report ----------
console.log('\n  Checking the site before you publish...\n');
passed.forEach(message => console.log(`  ✓ ${message}`));
if (warnings.length) {
  console.log(`\n  Worth a look (${warnings.length}):`);
  warnings.forEach(message => console.log(`  - ${message}`));
}
if (problems.length) {
  console.log(`\n  Fix before publishing (${problems.length}):`);
  problems.forEach((message, index) => console.log(`  ${index + 1}. ${message}`));
  console.log('\n  Not ready to publish yet.\n');
  process.exit(1);
}
console.log('\n  Ready to publish.\n');
