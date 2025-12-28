// Dynamically load metadata from DOM-rendered Cloudinary assets
const galleryGrid = document.getElementById('galleryGrid');

function prettifyFilename(src) {
  if (!src) return 'Untitled';
  try {
    const url = new URL(src, window.location.href);
    src = url.pathname;
  } catch (e) {
    // ignore URL parsing issues; fallback to raw string
  }
  const file = src.split('/').pop() || '';
  const withoutExt = file.replace(/\.[^.]+$/, '').replace(/^_+/, '');
  const spaced = withoutExt.replace(/[-_]+/g, ' ').trim();
  return spaced ? spaced.replace(/\b\w/g, c => c.toUpperCase()) : 'Untitled';
}

const imageMeta = {};
const portfolioImageMeta = {};

function registerImageMetaFromElement(img) {
  if (!img) return;
  const fullSrc = img.dataset.full || img.currentSrc || img.src;
  const thumbSrc = img.currentSrc || img.src;
  const src = fullSrc || thumbSrc;
  if (!src) return;
  const title = (img.dataset.title || img.getAttribute('alt') || '').trim() || prettifyFilename(src);
  const description = (img.dataset.caption || '').trim();
  const date = (img.dataset.date || '').trim();
  const camera = (img.dataset.camera || 'Fujifilm XT-30').trim();
  const settings = (img.dataset.settings || '').trim();
  const meta = { title, description, date, camera, settings };
  imageMeta[thumbSrc || src] = meta;
  portfolioImageMeta[thumbSrc || src] = { title, description, filename: fullSrc || thumbSrc || src, camera };
  if (fullSrc && fullSrc !== thumbSrc) {
    imageMeta[fullSrc] = meta;
    portfolioImageMeta[fullSrc] = { title, description, filename: fullSrc, camera };
  }
  const publicId = img.dataset.publicId;
  if (publicId) {
    imageMeta[publicId] = meta;
    portfolioImageMeta[publicId] = { title, description, filename: src, camera };
  }
}

const images = Array.from(document.querySelectorAll('.gallery-grid img, .showcase-grid img, .featured-gallery-grid img'))
  .map(img => {
    registerImageMetaFromElement(img);
    return img.currentSrc || img.src;
  })
  .filter(Boolean);

// --- Modern Lightbox functionality ---
const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.innerHTML = `
  <div class="lightbox-overlay" tabindex="-1"></div>
  <div class="lightbox-content" role="dialog" aria-modal="true">
    <button class="lightbox-close" aria-label="Close">&times;</button>
    <div class="lightbox-img-container" style="display: flex; align-items: center; justify-content: center; position: relative;">
      <button class="lightbox-arrow lightbox-arrow-left" aria-label="Previous image" style="position: absolute; left: 0; top: 50%; transform: translateY(-50%);">&#8592;</button>
      <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
        <img src="" alt="Large view" class="lightbox-img" draggable="false">
      </div>
      <button class="lightbox-arrow lightbox-arrow-right" aria-label="Next image" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%);">&#8594;</button>
    </div>
    <div class="lightbox-title"></div>
    <button class="lightbox-details-btn" aria-expanded="false" title="Show image details" tabindex="0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    </button>
    <div class="lightbox-details-panel" aria-hidden="true"></div>
  </div>
`;
document.body.appendChild(lightbox);
const overlay = lightbox.querySelector('.lightbox-overlay');
const content = lightbox.querySelector('.lightbox-content');
const imgEl = lightbox.querySelector('.lightbox-img');
const titleEl = lightbox.querySelector('.lightbox-title');
const closeBtn = lightbox.querySelector('.lightbox-close');
const detailsBtn = lightbox.querySelector('.lightbox-details-btn');
const detailsPanel = lightbox.querySelector('.lightbox-details-panel');
const arrowLeft = lightbox.querySelector('.lightbox-arrow-left');
const arrowRight = lightbox.querySelector('.lightbox-arrow-right');


// --- Lightbox arrow/details fade logic ---
const arrowButtons = [arrowLeft, arrowRight];
const detailsBtnFade = detailsBtn;
let fadeTimeout = null;
let detailsPanelOpen = false;

function showControls() {
  arrowButtons.forEach(btn => {
    btn.style.opacity = '0.85';
    btn.style.pointerEvents = 'auto';
    btn.style.transition = 'opacity 0.4s cubic-bezier(.77,0,.18,1)';
  });
  if (!detailsPanelOpen) {
    detailsBtnFade.classList.remove('fade');
  }
  if (fadeTimeout) clearTimeout(fadeTimeout);
  if (!detailsPanelOpen) {
    fadeTimeout = setTimeout(hideControls, 900);
  }
}

function hideControls() {
  arrowButtons.forEach(btn => {
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
  });
  if (!detailsPanelOpen) {
    detailsBtnFade.classList.add('fade');
  }
}

function setupControlsFade() {
  // Show controls on mousemove in lightbox
  lightbox.addEventListener('mousemove', () => {
    if (!lightbox.classList.contains('active')) return;
    showControls();
  });
  // Show controls on focus (keyboard nav)
  [...arrowButtons, detailsBtnFade].forEach(btn => {
    btn.addEventListener('focus', showControls);
  });
  // Hide controls when lightbox closes
  lightbox.addEventListener('transitionend', () => {
    if (!lightbox.classList.contains('active')) hideControls();
  });
}

setupControlsFade();

// Show controls when lightbox opens
let __origOpenLightbox = typeof openLightbox === 'function' ? openLightbox : null;
openLightbox = function(...args) {
  if (__origOpenLightbox) __origOpenLightbox.apply(this, args);
  detailsPanelOpen = false;
  detailsBtn.classList.remove('active');
  showControls();
};

let currentIndex = 0;
let currentImages = images.slice();
let currentImageData = {};

// Example image metadata (expand as needed)
function getImageMeta(src) {
  if (imageMeta[src]) return imageMeta[src];
  // Try matching by filename if full URL is not stored
  const matchKey = Object.keys(imageMeta).find(key => src && (src === key || src.endsWith(key)));
  if (matchKey) return imageMeta[matchKey];
  const fallbackTitle = prettifyFilename(src);
  return { title: fallbackTitle, description: 'No description.', date: '', camera: 'Fujifilm XT-30', settings: '' };
}

function normalizeImageList(src, list) {
  if (Array.isArray(list) && list.length) return list;
  if (images.length) return images;
  if (src) return [src];
  return [];
}

function openLightbox(src, imgs) {
  currentImages = normalizeImageList(src, imgs);
  if (!currentImages.length && src) {
    currentImages = [src];
  }
  currentIndex = currentImages.findIndex(item => item === src);
  if (currentIndex === -1 && src) {
    currentIndex = currentImages.findIndex(item => src.endsWith(item));
  }
  if (currentIndex === -1) currentIndex = 0;
  if (!currentImages.length) return;
  showLightboxImage(currentIndex);
  lightbox.classList.add('active');
  content.focus();
  document.body.style.overflow = 'hidden';
}
// expose globally for portfolio deep-linking
if (typeof window !== 'undefined') window.openLightbox = openLightbox;

function showLightboxImage(idx) {
  const src = currentImages[idx];
  imgEl.src = src;
  imgEl.alt = getImageMeta(src).title || 'Large view';
  titleEl.textContent = getImageMeta(src).title;
  currentImageData = getImageMeta(src);
  // Responsive, animated details panel markup
  detailsPanel.innerHTML = `
    <div class="lightbox-details-panel-row"><strong>Description:</strong> <span>${currentImageData.description || 'N/A'}</span></div>
    <div class="lightbox-details-panel-row"><strong>Date:</strong> <span>${currentImageData.date || 'N/A'}</span></div>
    <div class="lightbox-details-panel-row"><strong>Camera:</strong> <span>${currentImageData.camera || 'N/A'}</span></div>
    <div class="lightbox-details-panel-row"><strong>Settings:</strong> <span>${currentImageData.settings || 'N/A'}</span></div>
  `;
  detailsBtn.setAttribute('aria-expanded', 'false');
  detailsPanel.setAttribute('aria-hidden', 'true');
  detailsPanel.classList.remove('open');
}

function closeLightbox() {
  lightbox.classList.remove('active');
  imgEl.src = '';
  document.body.style.overflow = '';
}

closeBtn.addEventListener('click', closeLightbox);
overlay.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});


// Keyboard navigation and accessibility
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    showPrevImage();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    showNextImage();
  }
});

// --- Swipe gesture support for Lightbox on mobile ---
let touchStartX = null;
let touchStartY = null;
let touchEndX = null;
let touchEndY = null;
const SWIPE_THRESHOLD = 48; // px

function handleTouchStart(e) {
  if (!lightbox.classList.contains('active')) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchMove(e) {
  if (!lightbox.classList.contains('active')) return;
  const touch = e.touches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
}

function handleTouchEnd(e) {
  if (!lightbox.classList.contains('active')) return;
  if (touchStartX === null || touchEndX === null) return;
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    if (dx < 0) {
      // Swipe left: next image
      showNextImage();
    } else {
      // Swipe right: previous image
      showPrevImage();
    }
  }
  touchStartX = null;
  touchEndX = null;
  touchStartY = null;
  touchEndY = null;
}

lightbox.addEventListener('touchstart', handleTouchStart, { passive: true });
lightbox.addEventListener('touchmove', handleTouchMove, { passive: true });
lightbox.addEventListener('touchend', handleTouchEnd, { passive: true });

arrowLeft.addEventListener('click', showPrevImage);
arrowRight.addEventListener('click', showNextImage);

function showPrevImage() {
  if (currentIndex > 0) {
    currentIndex--;
    showLightboxImage(currentIndex);
  } else {
    currentIndex = currentImages.length - 1;
    showLightboxImage(currentIndex);
  }
}
function showNextImage() {
  if (currentIndex < currentImages.length - 1) {
    currentIndex++;
    showLightboxImage(currentIndex);
  } else {
    currentIndex = 0;
    showLightboxImage(currentIndex);
  }
}

// Details panel toggle
detailsBtn.addEventListener('click', () => {
  const expanded = detailsBtn.getAttribute('aria-expanded') === 'true';
  detailsBtn.setAttribute('aria-expanded', !expanded);
  detailsPanel.setAttribute('aria-hidden', expanded);
  if (!expanded) {
    imgEl.classList.add('details-open');
    detailsPanel.classList.add('open');
    detailsBtn.classList.add('active');
    detailsPanelOpen = true;
    detailsBtn.classList.remove('fade');
  } else {
    imgEl.classList.remove('details-open');
    detailsPanel.classList.remove('open');
    detailsBtn.classList.remove('active');
    detailsPanelOpen = false;
    showControls();
  }
});

// Trap focus inside lightbox for accessibility
lightbox.addEventListener('keydown', function(e) {
  if (!lightbox.classList.contains('active')) return;
  const focusable = lightbox.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});

// --- Patch gallery image click handlers to pass correct image list ---
if (galleryGrid) {
  images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Photography by Sigurd Rolfsnes';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(src, images));
    galleryGrid.appendChild(img);
  });
}

// Smooth scroll for nav links
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    const selector = this.getAttribute('href');
    if (!selector || !selector.startsWith('#')) return;
    const target = document.querySelector(selector);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// --- Portfolio Category Filtering ---
const portfolioGallery = document.getElementById('portfolioGallery');
const categoryBtns = document.querySelectorAll('.category-btn');
const categoryNodes = Array.from(document.querySelectorAll('.gallery-category'));
const hasCategoryNodes = categoryNodes.length > 0;

// Use smaller Cloudinary thumbnails in the grid, keep full-res for lightbox
function makeCloudinaryThumbUrl(originalUrl) {
  if (!originalUrl) return originalUrl;
  try {
    const url = new URL(originalUrl);
    const uploadToken = '/upload/';
    const idx = url.pathname.indexOf(uploadToken);
    if (idx === -1) return originalUrl;
    const before = url.pathname.slice(0, idx + uploadToken.length);
    const after = url.pathname.slice(idx + uploadToken.length);
    // Avoid double-inserting transforms if already present
    if (/f_auto|w_\d|q_auto/.test(after)) return originalUrl;
    const transformedPath = `${before}f_auto,q_auto,w_640/${after}`;
    return `${url.origin}${transformedPath}`;
  } catch (e) {
    return originalUrl;
  }
}

// At load time, convert portfolio category images to thumbs and stash full URL
(function preparePortfolioThumbs() {
  if (!hasCategoryNodes) return;
  categoryNodes.forEach(node => {
    node.querySelectorAll('img').forEach(img => {
      const existingFull = img.dataset.full || img.getAttribute('data-full');
      const raw = existingFull || img.getAttribute('src');
      if (!raw) return;
      const full = raw;
      const thumb = makeCloudinaryThumbUrl(full);
      img.dataset.full = full;
      img.setAttribute('src', thumb);
      img.loading = 'lazy';
    });
  });
})();

// Lazily hydrate category images so hidden categories don't eagerly download everything
function hydrateCategoryImages(node) {
  if (!node) return;
  node.querySelectorAll('img').forEach(img => {
    const pendingSrc = img.dataset.src;
    const pendingSrcset = img.dataset.srcset;
    if (pendingSrc && img.dataset.hydrated !== 'true') {
      img.src = pendingSrc;
      if (pendingSrcset) img.srcset = pendingSrcset;
      img.dataset.hydrated = 'true';
    }
    img.loading = 'lazy';
  });
}

function stashInactiveCategoryImages(activeCategory) {
  categoryNodes.forEach(node => {
    const isActive = ((node.dataset.category || '').trim() === (activeCategory || '').trim());
    node.querySelectorAll('img').forEach(img => {
      img.loading = 'lazy';
      if (isActive) return;
      if (!img.dataset.src && img.getAttribute('src')) {
        img.dataset.src = img.getAttribute('src');
        img.removeAttribute('src');
      }
      if (!img.dataset.srcset && img.getAttribute('srcset')) {
        img.dataset.srcset = img.getAttribute('srcset');
        img.removeAttribute('srcset');
      }
      img.dataset.hydrated = 'false';
    });
  });
}

const portfolioImages = {};

// If the page was generated from `_data/images.yml` the gallery HTML is already present
// and we should use those images instead of the old hardcoded lists. Build
// `portfolioImages` dynamically from existing `.gallery-category` nodes when present.
(() => {
  try {
    const categories = Array.from(document.querySelectorAll('.gallery-category'));
    if (categories.length) {
      const built = {};
      categories.forEach(cat => {
        const key = cat.dataset.category || 'uncategorized';
        const imgs = Array.from(cat.querySelectorAll('img')).map(img => {
          const src = img.currentSrc || img.src;
          if (!src) return null;
          const titleNode = img.closest('.gallery-img-wrapper')?.querySelector('.gallery-img-title');
          const rawTitle = (img.dataset.title || titleNode?.textContent || img.getAttribute('alt') || '').trim();
          const caption = (img.dataset.caption || '').trim();
          const title = rawTitle || prettifyFilename(src);
          const publicId = img.dataset.publicId || '';
          const date = (img.dataset.date || '').trim();
          const camera = (img.dataset.camera || 'Fujifilm XT-30').trim();
          imageMeta[src] = { title, description: caption, date, camera, settings: '' };
          if (publicId) imageMeta[publicId] = imageMeta[src];
          portfolioImageMeta[src] = { title, description: caption, filename: src, camera };
          if (publicId) portfolioImageMeta[publicId] = portfolioImageMeta[src];
          return { src, title, caption, publicId, date, camera };
        }).filter(Boolean);
        if (imgs.length) built[key] = imgs;
      });
      if (Object.keys(built).length) {
        Object.assign(portfolioImages, built);
      }
    }
  } catch (e) {
    // non-fatal; fallback to hardcoded lists
    console.warn('Could not build portfolioImages from DOM, falling back to defaults.', e);
  }
})();

function renderPortfolio(category) {
  if (!portfolioGallery) return;
  // If static DOM already has per-category containers, just toggle visibility
  if (hasCategoryNodes) {
    stashInactiveCategoryImages(category);
    categoryNodes.forEach(node => {
      const isActive = ((node.dataset.category || '').trim() === (category || '').trim());
      node.style.display = isActive ? '' : 'none';
      // Bind lightbox for currently visible category
      if (isActive) {
        hydrateCategoryImages(node);
        node.querySelectorAll('img').forEach(img => registerImageMetaFromElement(img));
      }
    });
    enableGalleryLightbox('#portfolioGallery');
    return;
  }
  // Fallback: dynamically render from portfolioImages map
  portfolioGallery.innerHTML = '';
  const imgs = portfolioImages[category] || [];
  imgs.forEach((item, i) => {
    const data = typeof item === 'string' ? { src: item } : item;
    if (!data.src) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'gallery-img-wrapper';
    const img = document.createElement('img');
    img.src = data.src;
    img.alt = data.title || 'Photography by Sigurd Rolfsnes';
    if (data.caption) img.dataset.caption = data.caption;
    if (data.publicId) img.dataset.publicId = data.publicId;
    if (data.date) img.dataset.date = data.date;
    if (data.camera) img.dataset.camera = data.camera;
    img.loading = 'lazy';
    img.classList.add('portfolio-img');
    img.style.setProperty('--i', i+1);
    registerImageMetaFromElement(img);
    wrapper.appendChild(img);
    const titleDiv = document.createElement('div');
    titleDiv.className = 'gallery-img-title';
    titleDiv.textContent = data.title || prettifyFilename(data.src);
    wrapper.appendChild(titleDiv);
    portfolioGallery.appendChild(wrapper);
  });
  enableGalleryLightbox('#portfolioGallery');
}
if (typeof window !== 'undefined') {
  window.renderPortfolio = renderPortfolio;
}
if (portfolioGallery && categoryBtns.length) {
  const availableCategories = hasCategoryNodes
    ? categoryNodes.map(n => (n.dataset.category || '').trim()).filter(Boolean)
    : Object.keys(portfolioImages);
  // Prefer an already-marked active button, else 'astro', else first available
  const activeBtn = Array.from(categoryBtns).find(b => b.classList.contains('active'));
  const defaultCategory = activeBtn?.dataset?.category?.trim() ||
    (availableCategories.includes('astro') ? 'astro' : (categoryBtns[0]?.dataset?.category?.trim() || availableCategories[0]));
  if (defaultCategory) {
    renderPortfolio(defaultCategory);
    categoryBtns.forEach(btn => {
      const val = (btn.dataset.category || '').trim();
      btn.classList.toggle('active', val === defaultCategory);
    });
  }
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = (btn.dataset.category || '').trim();
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPortfolio(val);
    });
  });
}

// --- Lightbox for all galleries ---
function enableGalleryLightbox(selector) {
  const gallery = document.querySelector(selector);
  if (!gallery) return;
  gallery.querySelectorAll('img').forEach(img => {
    registerImageMetaFromElement(img);
    if (img.dataset.lightboxBound === 'true') return;
    img.addEventListener('click', () => {
      const list = Array.from(gallery.querySelectorAll('img'))
        .filter(el => el.offsetParent !== null) // only visible images
        .map(el => el.dataset.full || el.currentSrc || el.src)
        .filter(Boolean);
      const initial = img.dataset.full || img.currentSrc || img.src;
      openLightbox(initial, list);
    });
    img.dataset.lightboxBound = 'true';
  });
}
window.addEventListener('DOMContentLoaded', () => {
  enableGalleryLightbox('.gallery-grid');
  enableGalleryLightbox('.showcase-grid');
  enableGalleryLightbox('.blog-list');
});

// --- Animate fade-in for images and cards ---
function animateFadeIn(selector) {
  const items = document.querySelectorAll(selector);
  items.forEach((el, i) => {
    el.style.setProperty('--i', i+1);
  });
}
window.addEventListener('DOMContentLoaded', () => {
  animateFadeIn('.gallery-grid img');
  animateFadeIn('.showcase-item');
  animateFadeIn('.blog-preview');
});


// --- Hamburger menu logic for mobile ---
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !expanded);
      navLinks.classList.toggle('open');
    });

    // Close menu when clicking outside (for better UX)
    document.addEventListener('click', function(e) {
      if (navLinks.classList.contains('open') && !navLinks.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }
});

  // Language toggle
  (function setupLanguageToggle() {
    const toggle = document.getElementById('langToggle');
    if (!toggle) return;

    const preferred = localStorage.getItem('site-lang') || 'nb';
    applyLanguage(preferred);

    toggle.addEventListener('click', () => {
      const next = document.documentElement.lang === 'nb' ? 'en' : 'nb';
      applyLanguage(next);
      localStorage.setItem('site-lang', next);
    });
  })();

  function applyLanguage(lang) {
    document.documentElement.lang = lang;
    const targets = document.querySelectorAll('[data-i18n-nb], [data-i18n-en]');
    targets.forEach(el => {
      const nb = el.getAttribute('data-i18n-nb');
      const en = el.getAttribute('data-i18n-en');
      const next = lang === 'en' ? (en || nb) : (nb || en);
      if (next) {
        el.textContent = next;
      }
    });
    const toggle = document.getElementById('langToggle');
    if (toggle) {
      const label = lang === 'en' ? (toggle.getAttribute('data-i18n-en') || 'Norwegian / English') : (toggle.getAttribute('data-i18n-nb') || 'Norsk / Engelsk');
      toggle.textContent = label;
    }
  }
