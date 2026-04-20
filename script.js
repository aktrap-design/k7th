/* ============================================
   Gallery K7th — Script
   Hero carousel, gallery rendering, lightbox, filters
   ============================================ */

(function () {
  'use strict';

  // ---------- CONFIG ----------
  const CAROUSEL_INTERVAL = 5000; // ms between slides
  const CAROUSEL_TRANSITION = 1400; // matches CSS transition
  const SWIPE_THRESHOLD = 50; // px

  // ---------- STATE ----------
  let galleryData = null;
  let currentSlide = 0;
  let carouselTimer = null;
  let lightboxIndex = -1;
  let visibleItems = []; // currently visible gallery items (after filter)
  let touchStartX = 0;
  let touchStartY = 0;

  // ---------- DOM REFS ----------
  const heroTrack = document.getElementById('hero-track');
  const heroIndicators = document.getElementById('hero-indicators');
  const galleryGrid = document.getElementById('gallery-grid');
  const filterBar = document.getElementById('filter-bar');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxInfo = document.getElementById('lightbox-info');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  // ---------- INIT ----------
  async function init() {
    try {
      const res = await fetch('gallery.json');
      galleryData = await res.json();
    } catch (e) {
      console.error('Failed to load gallery.json:', e);
      return;
    }

    buildHeroCarousel(galleryData.hero);
    buildFilterButtons(galleryData.categories);
    buildGallery(galleryData.gallery);
    setupLightbox();
    observeScrollReveal();
  }

  // ==========================================
  //  HERO CAROUSEL
  // ==========================================
  function buildHeroCarousel(slides) {
    if (!slides || slides.length === 0) return;

    // Create slide elements
    slides.forEach((slide, i) => {
      const div = document.createElement('div');
      div.className = 'hero-slide' + (i === 0 ? ' active' : '');
      div.innerHTML = `<img src="${slide.src}" alt="${slide.alt}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
      heroTrack.appendChild(div);
    });

    // Create indicator dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      heroIndicators.appendChild(dot);
    });

    // Auto-advance
    startCarouselTimer();

    // Touch/swipe on hero
    const hero = document.getElementById('hero');
    hero.addEventListener('touchstart', onHeroTouchStart, { passive: true });
    hero.addEventListener('touchend', onHeroTouchEnd, { passive: true });

    // Pause on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopCarouselTimer();
      } else {
        startCarouselTimer();
      }
    });
  }

  function goToSlide(index) {
    const slides = heroTrack.querySelectorAll('.hero-slide');
    const dots = heroIndicators.querySelectorAll('.hero-dot');
    if (index === currentSlide || index < 0 || index >= slides.length) return;

    // Reset Ken Burns on previous slide
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');

    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');

    // Reset timer
    startCarouselTimer();
  }

  function nextSlide() {
    const total = heroTrack.querySelectorAll('.hero-slide').length;
    goToSlide((currentSlide + 1) % total);
  }

  function prevSlide() {
    const total = heroTrack.querySelectorAll('.hero-slide').length;
    goToSlide((currentSlide - 1 + total) % total);
  }

  function startCarouselTimer() {
    stopCarouselTimer();
    carouselTimer = setInterval(nextSlide, CAROUSEL_INTERVAL);
  }

  function stopCarouselTimer() {
    if (carouselTimer) {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }
  }

  // Hero swipe
  function onHeroTouchStart(e) {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }

  function onHeroTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextSlide();
      else prevSlide();
    }
  }

  // ==========================================
  //  FILTER BUTTONS
  // ==========================================
  function buildFilterButtons(categories) {
    if (!categories || categories.length === 0) return;

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = cat;
      btn.textContent = cat;
      filterBar.appendChild(btn);
    });

    // Click handler
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      // Update active state
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      applyFilter(btn.dataset.filter);
    });
  }

  function applyFilter(category) {
    const items = galleryGrid.querySelectorAll('.gallery-item');
    visibleItems = [];

    items.forEach((item) => {
      const match = category === 'ALL' || item.dataset.category === category;
      if (match) {
        item.classList.remove('filtered-out');
        visibleItems.push(item);
      } else {
        item.classList.add('filtered-out');
      }
    });
  }

  // ==========================================
  //  GALLERY GRID
  // ==========================================
  function buildGallery(images) {
    if (!images || images.length === 0) return;

    images.forEach((img, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item reveal';
      item.dataset.index = i;
      item.dataset.category = img.category;

      item.innerHTML = `
        <img src="${img.src}" alt="${img.alt}" loading="lazy" decoding="async">
        <div class="gallery-item-overlay">
          <span class="gallery-item-title">${img.alt}</span>
          <span class="gallery-item-category">${img.category}</span>
        </div>
      `;

      item.addEventListener('click', () => openLightbox(i));
      galleryGrid.appendChild(item);
    });

    // Initialize visible items
    visibleItems = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
  }

  // ==========================================
  //  LIGHTBOX
  // ==========================================
  function setupLightbox() {
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    lightboxNext.addEventListener('click', () => navigateLightbox(1));

    // Close on backdrop click
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    });

    // Lightbox swipe
    lightbox.addEventListener('touchstart', onLightboxTouchStart, { passive: true });
    lightbox.addEventListener('touchend', onLightboxTouchEnd, { passive: true });
  }

  function openLightbox(index) {
    lightboxIndex = index;
    updateLightboxImage();
    lightbox.removeAttribute('hidden');
    // Force reflow before adding class for transition
    void lightbox.offsetHeight;
    lightbox.classList.add('open');
    document.body.classList.add('lightbox-open');
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    setTimeout(() => {
      lightbox.setAttribute('hidden', '');
    }, 400);
  }

  function navigateLightbox(dir) {
    const images = galleryData.gallery;
    // Find next/prev visible item
    let newIndex = lightboxIndex;
    const totalImages = images.length;

    for (let step = 0; step < totalImages; step++) {
      newIndex = (newIndex + dir + totalImages) % totalImages;
      // Check if this image is currently visible (not filtered out)
      const item = galleryGrid.querySelector(`.gallery-item[data-index="${newIndex}"]`);
      if (item && !item.classList.contains('filtered-out')) {
        break;
      }
    }

    lightboxIndex = newIndex;
    updateLightboxImage();
  }

  function updateLightboxImage() {
    const img = galleryData.gallery[lightboxIndex];
    if (!img) return;
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxInfo.querySelector('.lightbox-title').textContent = img.alt;
    lightboxInfo.querySelector('.lightbox-category').textContent = img.category;
  }

  // Lightbox swipe
  let lbTouchStartX = 0;
  function onLightboxTouchStart(e) {
    lbTouchStartX = e.changedTouches[0].clientX;
  }

  function onLightboxTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - lbTouchStartX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      navigateLightbox(dx < 0 ? 1 : -1);
    }
  }

  // ==========================================
  //  SCROLL REVEAL (Intersection Observer)
  // ==========================================
  function observeScrollReveal() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Stagger animation based on position
            const item = entry.target;
            const rect = item.getBoundingClientRect();
            const col = Math.floor((rect.left / window.innerWidth) * 4); // approx column
            const delay = col * 80; // stagger per column

            setTimeout(() => {
              item.classList.add('visible');
            }, delay);

            observer.unobserve(item);
          }
        });
      },
      {
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1,
      }
    );

    document.querySelectorAll('.gallery-item.reveal').forEach((item) => {
      observer.observe(item);
    });
  }

  // ---------- BOOT ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
