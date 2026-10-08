// Pre-publish check for the personal website.
// Run it from VS Code's terminal before you upload the site:  npm run check
//
// Why this exists: site-content.json is uploaded with the site, so anyone can open
// yoursite.com/site-content.json and read all of it, including text the page never shows.
// This makes sure nothing private is in it, the contact buttons will show up, and the
// private files stay on your Mac. Uses only Node's built-in modules, so there is nothing to install.

const fs = require('fs');
const path = require('path');
const pages = require('./pages.js');

const ROOT = path.join(__dirname, '..');
const PRIVATE_FILES = ['NOTES.md', 'site-content-private.md', 'ethan-site-brief.md', '_old-version-*/', '.claude/'];

const problems = [];  // fix these before publishing
const warnings = [];  // worth a look
const passed = [];

// Same rule as isSafeHref() in script.js: the site only shows links that pass it.
function isSafeHref(href) {
  if (typeof href !== 'string' || href.trim() === '' || href.includes('TODO')) return false;
  return /^#[\w-]+$/.test(href) || /^https:\/\//.test(href) || /^mailto:[^\s]+$/.test(href) ||
    /^[\w./-]+\.(pdf|html)$/.test(href) || /^projects\/[\w-]+\/$/.test(href);
}

// Phone photos often carry the exact spot they were taken. These two look for it.
// JPEG: an Exif block with a GPS section that has a latitude in it.
function jpegHasLocation(buffer) {
  try {
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return false;
    let offset = 2;
    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xFF) return false;
      const marker = buffer[offset + 1];
      if (marker === 0xDA || marker === 0xD9) return false; // the image data starts; no more metadata
      const length = buffer.readUInt16BE(offset + 2);
      if (marker === 0xE1 && buffer.toString('latin1', offset + 4, offset + 10) === 'Exif\0\0') {
        const tiff = offset + 10;
        const little = buffer.toString('latin1', tiff, tiff + 2) === 'II';
        const u16 = at => (little ? buffer.readUInt16LE(at) : buffer.readUInt16BE(at));
        const u32 = at => (little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at));
        const ifd0 = tiff + u32(tiff + 4);
        for (let i = 0; i < u16(ifd0); i += 1) {
          const entry = ifd0 + 2 + i * 12;
          if (u16(entry) !== 0x8825) continue;
          const gps = tiff + u32(entry + 8);
          for (let j = 0; j < u16(gps); j += 1) {
            if (u16(gps + 2 + j * 12) === 0x0002) return true; // GPS latitude
          }
        }
      }
      offset += 2 + length;
    }
  } catch {
    return false;
  }
  return false;
}

// PNG: an eXIf chunk (camera data, which can include location).
function pngHasExif(buffer) {
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (type === 'eXIf') return true;
    if (type === 'IDAT' || type === 'IEND') return false;
    offset += 12 + length;
  }
  return false;
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
walk(content.projects || [], 'projects');

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

// ---------- projects and photos ----------
const projectsBefore = problems.length;
const projects = content.projects || [];
const CATEGORY_IDS = ['engineering', 'startup', 'leadership', 'education', 'work', 'life'];
const pageProjects = pages.projectsWithPages(content);
const pageIds = new Set(pageProjects.map(project => project.id));
let photoCount = 0;
projects.forEach((project, index) => {
  const name = `Project "${project.id || index}"`;
  if (project.publish !== true) {
    problems.push(`${name} isn't published, but anyone can still read it in site-content.json. Move it to site-content-private.md.`);
    return;
  }
  if (!/^[\w-]+$/.test(project.id || '')) problems.push(`${name} needs an "id" made of letters, numbers and dashes (it becomes the page address).`);
  if (!CATEGORY_IDS.includes(project.category)) warnings.push(`${name} has category "${project.category}", which has no color. Use one of: ${CATEGORY_IDS.join(', ')}.`);
  if (project.href && !isSafeHref(project.href)) problems.push(`${name} has "href": "${project.href}", which the site won't show. Use a #section link or leave href out to give it its own page.`);
  (project.photos || []).forEach((photo, photoIndex) => {
    const label = `${name}, photo ${photoIndex + 1} (${photo.src})`;
    if (typeof photo.src !== 'string' || !/^images\/[\w./-]+\.(jpe?g|png|webp|avif)$/i.test(photo.src) || photo.src.includes('..')) {
      if (typeof photo.src === 'string' && /\.hei[cf]$/i.test(photo.src)) {
        problems.push(`${label} is an iPhone HEIC photo, which Chrome and most browsers can't show. Export it as JPEG (in Photos: File > Export) and use the .jpg.`);
      } else {
        problems.push(`${label} must be a .jpg, .png, .webp or .avif file inside the images/ folder.`);
      }
      return;
    }
    if (!exists(photo.src)) {
      problems.push(`${label} isn't in the website folder yet.`);
      return;
    }
    photoCount += 1;
    if (typeof photo.alt !== 'string' || photo.alt.trim() === '' || photo.alt.includes('TODO')) {
      problems.push(`${label} needs "alt": a sentence describing the photo for people who can't see it. The site hides photos without one.`);
    }
    const file = fs.readFileSync(path.join(ROOT, photo.src));
    if (/\.jpe?g$/i.test(photo.src) && jpegHasLocation(file)) {
      problems.push(`${label} still has the location where it was taken saved inside it. On your Mac, open it in Preview, choose Tools > Show Inspector, open the (i) tab, then GPS, and click Remove Location Info. Then save.`);
    }
    if (/\.png$/i.test(photo.src) && pngHasExif(file)) {
      warnings.push(`${label} has camera data saved inside it, which can include where it was taken. Re-export it without metadata to be safe.`);
    }
    if (file.length > 900 * 1024) {
      warnings.push(`${label} is ${(file.length / 1024 / 1024).toFixed(1)} MB. Resize it to about 1600 pixels wide so the page loads fast on phones (in Preview: Tools > Adjust Size).`);
    }
  });
});
pageProjects.forEach(project => {
  const file = `projects/${project.id}/index.html`;
  if (!exists(file)) {
    problems.push(`The project "${project.id}" has no page yet. Run npm run pages to make ${file}.`);
  } else if (fs.readFileSync(path.join(ROOT, file), 'utf8') !== pages.buildProjectPage(project, site, pages.syncIndexHtml(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), site))) {
    problems.push(`${file} is out of date with site-content.json (title, description, address or photo). Run npm run pages.`);
  }
});
timeline.filter(item => typeof item.link === 'string' && item.link.startsWith('projects/')).forEach(item => {
  const id = (item.link.match(/^projects\/([\w-]+)\/$/) || [])[1];
  if (!id) problems.push(`Timeline entry "${item.id}" links to "${item.link}". Project links look like projects/<id>/ (with the slash at the end).`);
  else if (!pageIds.has(id)) problems.push(`Timeline entry "${item.id}" links to ${item.link}, but there's no published project "${id}" with its own page.`);
});
if (exists('projects')) {
  fs.readdirSync(path.join(ROOT, 'projects'), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !pageIds.has(entry.name))
    .forEach(entry => warnings.push(`projects/${entry.name}/ has no published project in site-content.json, but it would still be uploaded. Delete the folder if you don't need it.`));
}
if (problems.length === projectsBefore) {
  passed.push(`Project pages are up to date (${pageProjects.length} page${pageProjects.length === 1 ? '' : 's'}, ${photoCount} photo${photoCount === 1 ? '' : 's'}, no location data in the photos)`);
}

// ---------- link previews and the site address ----------
// LinkedIn and iMessage previews don't run script.js, so index.html carries its own copy of the
// description and address. npm run pages copies them over from site-content.json.
const addressBefore = problems.length;
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!pages.checkUrl(site.url || '')) {
  problems.push('"url" in site-content.json should be the site\'s full address, like https://ekbaker58.github.io/personal-website/ (https:// and a slash at the end).');
} else {
  if (pages.syncIndexHtml(indexHtml, site) !== indexHtml) {
    warnings.push('The description or address in index.html doesn\'t match site-content.json, so link previews (LinkedIn, iMessage) would show the old one. Run npm run pages.');
  }
  if (exists('CNAME')) {
    const domain = fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim();
    if (!site.url.startsWith(`https://${domain}/`)) {
      problems.push(`The CNAME file says your site lives at ${domain}, but site-content.json says ${site.url}. Run: npm run pages -- --url https://${domain}/`);
    }
  }
}
if (problems.length === addressBefore) passed.push(`Link previews and canonical addresses point to ${site.url}`);

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
