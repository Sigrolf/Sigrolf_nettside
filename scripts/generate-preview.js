#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const dataPath = path.join(process.cwd(), '_data', 'images.yml');
if (!fs.existsSync(dataPath)) {
  console.error('No _data/images.yml found. Run scripts/sync-cloudinary-images.js first.');
  process.exit(1);
}

const items = yaml.load(fs.readFileSync(dataPath, 'utf8')) || [];

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const previewDir = path.join(process.cwd(), 'preview');
if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

// Copy styling and scripts so preview matches your real site
const copyIfExists = (src, dest) => {
  const s = path.join(process.cwd(), src);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(previewDir, dest || path.basename(src)));
};
copyIfExists('style.css');
copyIfExists('script.js');
// copy portrait if present
copyIfExists('images/portrait.jpg', 'images/portrait.jpg');

// Helper: render featured block (up to 3)
const featured = items.filter(i => i.featured);
const featuredItems = (featured.length ? featured : items).slice(0,3);
const featuredHtml = featuredItems.map(i => `        <a href="portfolio.html?image=${encodeURIComponent(i.url)}" class="featured-img-card">\n          <img src="${escapeHtml(i.url)}" alt="${escapeHtml(i.title)}" class="featured-img">\n          <div class="featured-img-title">${escapeHtml(i.title)}</div>\n        </a>`).join('\n');
const portraitItem = items.find(i => (i.category || '') === 'Of_the_photographer') || items[0];
const portraitHtml = portraitItem ? `        <img src="${escapeHtml(portraitItem.url)}" alt="${escapeHtml(portraitItem.title || 'Portrait of Sigurd Rolfsnes')}" class="about-portrait-large">` : '';
const fallbackCoverForPosts = (featuredItems[0] && featuredItems[0].url) || (items[0] && items[0].url) || '';

// Render portfolio gallery grouped by category
let categories = Array.from(new Set(items.map(i => i.category || 'uncategorized')));
// Prefer 'astro' as the default category if present
if (categories.includes('astro')) {
  categories = ['astro', ...categories.filter(c => c !== 'astro')];
}
let galleryHtml = '';
for (const category of categories) {
  const imgs = items.filter(i => (i.category||'').toString() === category.toString());
  const show = category === categories[0];
  galleryHtml += `      <div class="gallery-category" data-category="${escapeHtml(category)}"${show ? '' : ' style="display:none;"'}>\n`;
  imgs.forEach(img => {
    galleryHtml += `        <div class="gallery-img-wrapper">\n          <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.title)}" data-caption="${escapeHtml(img.caption)}" data-public-id="${escapeHtml(img.public_id)}">\n          <div class="gallery-img-title">${escapeHtml(img.title)}</div>\n        </div>\n`;
  });
  galleryHtml += `      </div>\n`;
}

// Build dynamic category buttons (desktop + mobile) so preview matches categories from data
function niceName(cat) {
  return (cat || '').toString().replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function i18nAttrs(cat, isToggle=false) {
  const nm = niceName(cat);
  const suffix = isToggle ? ' ▼' : '';
  if (cat === 'landscapes') {
    return ` data-i18n-en="Landscapes${suffix}" data-i18n-nb="Landskap${suffix}"`;
  }
  if (cat === 'astro') {
    return ` data-i18n-en="Astro${suffix}" data-i18n-nb="Astro${suffix}"`;
  }
  if (cat === 'wildlife') {
    return ` data-i18n-en="Wildlife${suffix}" data-i18n-nb="Dyreliv${suffix}"`;
  }
  return '';
}
const desktopButtons = categories.map((c, idx) => `          <button class="category-btn${idx===0? ' active' : ''}" data-category="${escapeHtml(c)}"${i18nAttrs(c)}>${escapeHtml(niceName(c))}</button>`).join('\n');
const mobileItems = categories.map(c => `            <button class="category-btn" data-category="${escapeHtml(c)}"${i18nAttrs(c)}>${escapeHtml(niceName(c))}</button>`).join('\n');
const toggleCat = categories[0] || 'All';
const toggleLabel = niceName(toggleCat) + ' ▼';
const toggleI18n = i18nAttrs(toggleCat, true);
const portfolioCategoriesHtml = `    <div class="portfolio-categories">\n      <div class="portfolio-categories-desktop">\n${desktopButtons}\n      </div>\n      <div class="portfolio-categories-mobile">\n        <button class="category-dropdown-toggle" id="categoryDropdownToggle"${toggleI18n}>${escapeHtml(toggleLabel)}</button>\n        <div class="category-dropdown-menu" id="categoryDropdownMenu">\n${mobileItems}\n        </div>\n      </div>\n    </div>`;

// Read original templates and replace Liquid blocks
function renderFromTemplate(templatePath, outName) {
  const tplPath = path.join(process.cwd(), templatePath);
  if (!fs.existsSync(tplPath)) {
    console.error('Template not found:', templatePath);
    return;
  }
  let content = fs.readFileSync(tplPath, 'utf8');
  const doctypeIndex = content.indexOf('<!DOCTYPE');
  if (doctypeIndex !== -1) {
    content = content.slice(doctypeIndex);
  }
  // Replace featured loop in index.html
  content = content.replace(/\{%\s*for\s+img\s+in\s+featured[\s\S]*?\{%\s*endfor\s*%}/m, featuredHtml);
  // Replace portrait conditional with static image when available
  content = content.replace(/\{%\s*if\s+portrait_url[^%]*%}[\s\S]*?\{%\s*endif\s*%}/m, portraitHtml);
  // Inject fallback const so preview latest posts show a valid image
  if (fallbackCoverForPosts) {
    content = content.replace(/const FALLBACK_POST_IMAGE = "[^"]*";/, `const FALLBACK_POST_IMAGE = "${escapeHtml(fallbackCoverForPosts)}";`);
  }
  // Replace gallery block in portfolio.html (assign categories ... endfor)
  content = content.replace(/\{%\s*assign[\s\S]*?site\.data\.images[\s\S]*?%}\s*\{%\s*for[\s\S]*?endfor\s*%}/m, galleryHtml);
  // Replace static gallery markup when Liquid loop is absent (from previous builds)
  content = content.replace(/<div class="gallery-grid"[^>]*>[\s\S]*?<\/div>\s*<\/section>/m, `${portfolioCategoriesHtml}\n    <div class="gallery-grid" id="portfolioGallery">\n${galleryHtml}    <\/div>\n  <\/section>`);
  // Replace the hardcoded category buttons block so preview buttons match categories exactly
  content = content.replace(/<div class="portfolio-categories">[\s\S]*?<div class="gallery-grid"/m, portfolioCategoriesHtml + '\n    <div class="gallery-grid"');
  fs.writeFileSync(path.join(previewDir, outName), content, 'utf8');
}

renderFromTemplate('index.html', 'index.html');
renderFromTemplate('portfolio.html', 'portfolio.html');

// Render about, showcase and blog templates as plain HTML using the same data
function renderExtraTemplates() {
  // about.html: replace portrait img with first Of_the_photographer image if present
  const aboutPath = path.join(process.cwd(), 'about.html');
  if (fs.existsSync(aboutPath)) {
    let c = fs.readFileSync(aboutPath, 'utf8');
    const portrait = items.find(i => (i.category||'') === 'Of_the_photographer');
    if (portrait) {
      c = c.replace(/<img[^>]*class="about-portrait"[^>]*>/m, `<img src="${escapeHtml(portrait.url)}" alt="${escapeHtml(portrait.title)}" class="about-portrait">`);
    }
    fs.writeFileSync(path.join(previewDir, 'about.html'), c, 'utf8');
  }

  // showcase.html: inject up to 6 images (featured first, else first items)
  const showcasePath = path.join(process.cwd(), 'showcase.html');
  if (fs.existsSync(showcasePath)) {
    let c = fs.readFileSync(showcasePath, 'utf8');
    const showcaseImgs = items.filter(i => i.featured).length ? items.filter(i => i.featured).slice(0,6) : items.slice(0,6);
    const cardsHtml = showcaseImgs.map(i => `      <a class="showcase-card" href="#">\n        <img src="${escapeHtml(i.url)}" alt="${escapeHtml(i.title)}">\n      </a>`).join('\n');
    c = c.replace(/<div class="showcase-masonry-grid">[\s\S]*?<\/div>\s*<\/section>/m, `<div class="showcase-masonry-grid">\n${cardsHtml}\n    </div>\n  </section>`);
    fs.writeFileSync(path.join(previewDir, 'showcase.html'), c, 'utf8');
  }

  // blog.html: we render the file unchanged (JS will fetch posts from blog/). If posts include img public_id we could map, but keep as-is.
  const blogPath = path.join(process.cwd(), 'blog.html');
  if (fs.existsSync(blogPath)) {
    fs.writeFileSync(path.join(previewDir, 'blog.html'), fs.readFileSync(blogPath, 'utf8'), 'utf8');
  }
}

renderExtraTemplates();

console.log('Generated preview pages in ./preview (index.html, portfolio.html) and copied style/script.');
console.log('Open http://localhost:8000 to view the preview (server must be running).');
