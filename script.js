// Dynamically load images from the images/astro and images/landscapes folders
const galleryGrid = document.getElementById('galleryGrid');

// List of images (add more as needed)
const images = [
  // Astro
  'images/astro/_00001.jpg',
  'images/astro/_00002.jpg',
  'images/astro/_00003.jpg',
  'images/astro/_00004.jpg',
  'images/astro/_00005.jpg',
  'images/astro/_00006.jpg',
  'images/astro/_00007.jpg',
  'images/astro/_00008.jpg',
  'images/astro/_00009.jpg',
  'images/astro/_00010.jpg',
  // Landscapes
  'images/landscapes/_1.jpg',
  'images/landscapes/_2.jpg',
  'images/landscapes/_3.jpg',
  'images/landscapes/_4.jpg',
  'images/landscapes/_5.jpg',
  'images/landscapes/_6.jpg',
  'images/landscapes/_7.jpg',
  'images/landscapes/_8.jpg',
  'images/landscapes/_9.jpg',
  'images/landscapes/_10.jpg',

];

if (galleryGrid) {
  images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Photography by Sigurd Rolfsnes';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(src));
    galleryGrid.appendChild(img);
  });
}

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
const origOpenLightbox = openLightbox;
openLightbox = function(...args) {
  origOpenLightbox.apply(this, args);
  detailsPanelOpen = false;
  detailsBtn.classList.remove('active');
  showControls();
};

let currentIndex = 0;
let currentImages = images;
let currentImageData = {};

// Example image metadata (expand as needed)
const imageMeta = {
  'images/astro/_00001.jpg': { title: 'Andromeda Galaxy', description: 'Deep-sky view of the M31 Andromeda galaxy', date: '2024-07-01', camera: 'Fujifilm XT-30', settings: 'f/2.8, 20s, ISO 3200' },
  'images/astro/_00002.jpg': { title: 'Star Trails', description: 'Long exposure star trails.', date: '2024-06-15', camera: 'Fujifilm XT-30', settings: 'f/4, 300s, ISO 800' },
  'images/landscapes/_1.jpg': { title: 'Sunrise Valley', description: 'Golden hour in the valley.', date: '2024-05-10', camera: 'Fujifilm XT-30', settings: 'f/11, 1/60s, ISO 100' },
  // ...add more as needed
};

function getImageMeta(src) {
  return imageMeta[src] || { title: 'Untitled', description: 'No description.', date: '', camera: 'Fujifilm XT-30', settings: '' };
}

function openLightbox(src, imgs = images) {
  currentImages = imgs;
  currentIndex = imgs.indexOf(src);
  if (currentIndex === -1) currentIndex = 0;
  showLightboxImage(currentIndex);
  lightbox.classList.add('active');
  content.focus();
  document.body.style.overflow = 'hidden';
}

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

// Patch portfolio category switching to pass correct image list
function renderPortfolio(category) {
  if (!portfolioGallery) return;
  portfolioGallery.innerHTML = '';
  const imgs = portfolioImages[category];
  imgs.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Photography by Sigurd Rolfsnes';
    img.loading = 'lazy';
    img.classList.add('portfolio-img');
    img.style.setProperty('--i', i+1);
    img.addEventListener('click', () => openLightbox(src, imgs)); // <-- Pass correct array here
    portfolioGallery.appendChild(img);
  });
}

// Patch enableGalleryLightbox to pass correct image list
function enableGalleryLightbox(selector, imgs = images) {
  const gallery = document.querySelector(selector);
  if (!gallery) return;
  const imgEls = Array.from(gallery.querySelectorAll('img'));
  imgEls.forEach((img, i) => {
    img.addEventListener('click', () => openLightbox(img.src, imgEls.map(im => im.src)));
  });
}
window.addEventListener('DOMContentLoaded', () => {
  enableGalleryLightbox('.gallery-grid', images);
  enableGalleryLightbox('.showcase-grid');
  enableGalleryLightbox('.blog-list');
});

// Smooth scroll for nav links
const navLinks = document.querySelectorAll('.nav-links a');
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// --- Portfolio Category Filtering ---
const portfolioGallery = document.getElementById('portfolioGallery');
const categoryBtns = document.querySelectorAll('.category-btn');

const portfolioImages = {
  astro: [
    'images/astro/_00001.jpg',
    'images/astro/_00002.jpg',
    'images/astro/_00003.jpg',
    'images/astro/_00004.jpg',
    'images/astro/_00005.jpg',
    'images/astro/_00006.jpg',
    'images/astro/_00007.jpg',
    'images/astro/_00008.jpg',
    'images/astro/_00009.jpg',
    'images/astro/_00010.jpg',
  ],
  landscape: [
    ...Array.from({length: 100}, (_, i) => `images/landscapes/_${i+1}.jpg`),
  ],
  wildlife: [
    ...Array.from({length: 22}, (_, i) => `images/wildlife/_${i+1}.jpg`),
  ],
  portraits: [
    // Add portrait images if available
  ]
};

function renderPortfolio(category) {
  if (!portfolioGallery) return;
  portfolioGallery.innerHTML = '';
  const imgs = portfolioImages[category];
  imgs.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Photography by Sigurd Rolfsnes';
    img.loading = 'lazy';
    img.classList.add('portfolio-img');
    img.style.setProperty('--i', i+1);
    img.addEventListener('click', () => openLightbox(src, imgs)); // <-- Pass correct array here
    portfolioGallery.appendChild(img);
  });
}
if (portfolioGallery && categoryBtns.length) {
  renderPortfolio('astro');
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPortfolio(btn.dataset.category);
    });
  });
}

// --- Lightbox for all galleries ---
function enableGalleryLightbox(selector) {
  const gallery = document.querySelector(selector);
  if (!gallery) return;
  gallery.querySelectorAll('img').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src));
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



// Portfolio image titles stored in script

// Portfolio image metadata dictionary
const portfolioImageMeta = {
  'images/astro/_00001.jpg': { title: 'Andromeda galaxy', description: 'Deep-sky view of the M31 Andromeda galaxy.', camera: 'Fujifilm XT-30' },
  'images/astro/_00002.jpg': { title: 'Star Trails', description: 'Long exposure star trails.', camera: 'Fujifilm XT-30' },
  'images/astro/_00003.jpg': { title: 'Aurora Night', description: 'Northern lights over the fjord.', camera: 'Fujifilm XT-30' },
  'images/astro/_00004.jpg': { title: 'Comet Over Lake', description: 'Comet NEOWISE above a tranquil lake.', camera: 'Fujifilm XT-30' },
  'images/astro/_00005.jpg': { title: 'Galactic Core', description: 'The core of the Milky Way in summer.', camera: 'Fujifilm XT-30' },
  'images/astro/_00006.jpg': { title: 'Desert Stars', description: 'Starry night in the desert.', camera: 'Fujifilm XT-30' },
  'images/astro/_00007.jpg': { title: 'Moonrise', description: 'Full moon rising over the mountains.', camera: 'Fujifilm XT-30' },
  'images/astro/_00008.jpg': { title: 'Nebula Glow', description: 'Emission nebula glowing in red.', camera: 'Fujifilm XT-30' },
  'images/astro/_00009.jpg': { title: 'Starlit Peaks', description: 'Mountain peaks under a starry sky.', camera: 'Fujifilm XT-30' },
  'images/astro/_00010.jpg': { title: 'Night Horizon', description: 'Stars meeting the horizon at dusk.', camera: 'Fujifilm XT-30' },
  // Landscapes auto-generated below
};

// Auto-generate landscape metadata
for (let i = 1; i <= 100; i++) {
  const filename = `images/landscapes/_${i}.jpg`;
  portfolioImageMeta[filename] = {
    title: `Landscape ${i}`,
    description: `Landscape photo number ${i}.`,
    filename: filename,
    camera: 'Fujifilm XT-30'
  };
}
// Auto-generate wildlife metadata
for (let i = 1; i <= 22; i++) {
  const filename = `images/wildlife/_${i}.jpg`;
  portfolioImageMeta[filename] = {
    title: `Wildlife ${i}`,
    description: `Wildlife photo number ${i}.`,
    filename: filename,
    camera: 'Fujifilm XT-30'
  };
}

function getPortfolioImgMeta(src) {
  // src may be absolute, so match on the end
  for (const key in portfolioImageMeta) {
    if (src.endsWith(key)) return portfolioImageMeta[key];
  }
  // Fallback: prettify filename
  let fileName = src.split('/').pop().replace(/\.[^.]+$/, '');
  let title = fileName.replace(/^_+/, '').replace(/_/g, ' ');
  return { title: title.replace(/\b\w/g, c => c.toUpperCase()), description: '', filename: src, camera: 'Fujifilm XT-30' };
}

// Enhance portfolio images: wrap in .portfolio-img-wrapper and use title from script
function enhancePortfolioImages() {
  const gallery = document.getElementById('portfolioGallery');
  if (!gallery) return;
  Array.from(gallery.querySelectorAll('img')).forEach(img => {
    // Skip if already wrapped
    if (img.parentElement && img.parentElement.classList.contains('portfolio-img-wrapper')) return;
    // Get metadata from script
    const meta = getPortfolioImgMeta(img.src || img.getAttribute('src'));
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'portfolio-img-wrapper';
    img.classList.add('portfolio-img');
    // Create title bar
    const titleDiv = document.createElement('div');
    titleDiv.className = 'portfolio-img-title';
    titleDiv.textContent = meta.title;
    // Optionally add description as tooltip
    if (meta.description) img.title = meta.description;
    // Insert
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
    wrapper.appendChild(titleDiv);
  });
}

// Enhance after rendering portfolio
if (portfolioGallery && categoryBtns.length) {
  // Render and enhance images, then set up click handlers for lightbox
  function renderAndEnhance(category) {
    renderPortfolio(category);
    setTimeout(() => {
      enhancePortfolioImages();
      // Set up correct click handlers for lightbox
      Array.from(portfolioGallery.querySelectorAll('img')).forEach(img => {
        img.onclick = () => {
          const imgs = Array.from(portfolioGallery.querySelectorAll('img')).map(im => im.src);
          openLightbox(img.src, imgs);
        };
      });
    }, 0);
  }
  // Ensure correct handlers on first load
  window.addEventListener('DOMContentLoaded', () => {
    renderAndEnhance('astro');
    // Set active class on default category button
    categoryBtns.forEach(b => b.classList.remove('active'));
    const defaultBtn = Array.from(categoryBtns).find(btn => btn.dataset.category === 'astro');
    if (defaultBtn) defaultBtn.classList.add('active');
    // Set up category switching
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderAndEnhance(btn.dataset.category);
      });
    });
  });
}
