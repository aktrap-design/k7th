/* ============================================
   Gallery K7th — Script
   Hero carousel, gallery rendering, lightbox, filters
   ============================================ */

(function () {
  'use strict';

  // ---------- CONFIG ----------
  const CAROUSEL_INTERVAL = 5000; // ms between slides
  const HERO_WIPE_SWAP_MS = 650;
  const HERO_WIPE_CLEANUP_MS = 1300;
  const SWIPE_THRESHOLD = 50; // px
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const processorCores = navigator.hardwareConcurrency || 4;
  const tileProfile = !coarsePointer && finePointer && processorCores >= 8
    ? { edge: 13, budget: 240 }
    : coarsePointer || processorCores <= 4
      ? { edge: 20, budget: 144 }
      : { edge: 17, budget: 180 };

  // ---------- STATE ----------
  let galleryData = null;
  let currentSlide = 0;
  let carouselTimer = null;
  let lightboxIndex = -1;
  let lightboxMode = 'gallery';
  let visibleItems = []; // currently visible gallery items (after filter)
  let touchStartX = 0;
  let touchStartY = 0;

  // ---------- DOM REFS ----------
  const heroTrack = document.getElementById('hero-track');
  const heroIndicators = document.getElementById('hero-indicators');
  const hero = document.getElementById('hero');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryLoading = document.getElementById('gallery-loading');
  const filterBar = document.getElementById('filter-bar');
  const galleryCount = document.getElementById('gallery-count');
  const gallerySearch = document.getElementById('gallery-search');
  const galleryProgressBar = document.getElementById('gallery-progress-bar');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxInfo = document.getElementById('lightbox-info');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const throwbackSection = document.getElementById('throwback-section');
  const throwbackBanner = document.getElementById('throwback-banner');
  const throwbackLightbox = document.getElementById('throwback-lightbox');
  const throwbackImage = document.getElementById('throwback-image');
  const throwbackTitle = document.getElementById('throwback-title');
  const throwbackCounter = document.getElementById('throwback-counter');
  const throwbackClose = document.getElementById('throwback-close');
  const throwbackPrev = document.getElementById('throwback-prev');
  const throwbackNext = document.getElementById('throwback-next');
  const behindGrid = document.getElementById('behind-grid');
  let throwbackIndex = 0;
  let throwbackTouchStartX = 0;
  let activeGalleryFilter = 'ALL';

  function enforceTopOnReload() {
    try {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      const navEntry = performance.getEntriesByType('navigation')[0];
      const isReload = navEntry && navEntry.type === 'reload';
      if (isReload) {
        window.scrollTo(0, 0);
        requestAnimationFrame(() => window.scrollTo(0, 0));
      }
    } catch (_) {
      // no-op
    }
  }

  function normalizeList(maybeList) {
    if (Array.isArray(maybeList)) return maybeList;
    if (maybeList && typeof maybeList === 'object') return Object.values(maybeList);
    return [];
  }

  function getThrowbackItems() {
    const direct = normalizeList(galleryData && galleryData.throwback);
    if (direct.length) return direct.filter((item) => item && item.src);
    // Backward/alternate fallback just in case data key changed in CMS.
    const legacy = normalizeList(galleryData && galleryData.throwBack);
    return legacy.filter((item) => item && item.src);
  }

  function addRafScrollListener(update) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }, { passive: true });
  }

  function openOverlay(el) {
    if (!el) return;
    el.removeAttribute('hidden');
    void el.offsetHeight; // force reflow for transition start
    el.classList.add('open');
    document.body.classList.add('lightbox-open');
  }

  function closeOverlay(el, delayMs) {
    if (!el) return;
    el.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    setTimeout(() => {
      el.setAttribute('hidden', '');
    }, delayMs);
  }

  function hideGalleryLoading() {
    if (!galleryLoading) return;
    galleryLoading.classList.remove('show');
    galleryLoading.setAttribute('aria-hidden', 'true');
  }

  function runGalleryLoadingForFilter(category) {
    applyFilter(category);
    galleryGrid.setAttribute('aria-busy', 'false');
  }

  // ---------- INIT ----------
  async function init() {
    try {
      const res = await fetch('gallery.json');
      galleryData = await res.json();
    } catch (e) {
      console.error('Failed to load gallery.json:', e);
      if (galleryLoading) galleryLoading.textContent = 'Gallery could not be loaded';
      return;
    }

    buildHeroCarousel(galleryData.hero);
    buildCuratedCarousel(galleryData.curated);
    buildFilterButtons(galleryData.categories);
    buildGallery(galleryData.gallery);
    hideGalleryLoading();
    setupGallerySearch();
    setupGalleryProgress();
    runGalleryLoadingForFilter('ALL');
    setupGalleryDepth();
    setupGalleryNumberParallax();
    buildThrowback(getThrowbackItems());
    buildBehindTheFrame(galleryData.behindTheFrame);
    setupLightbox();
    setupThrowbackLightbox();
    observeScrollReveal();
    setupVideoParallax();
    setupInterludeParallax();
    setupBGM();
    setupPageTopButton();
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
      const loadingMode = i < 3 ? 'eager' : 'lazy';
      const fetchPriority = i < 2 ? 'high' : 'auto';
      div.innerHTML = `<img src="${slide.src}" alt="${slide.alt}" loading="${loadingMode}" fetchpriority="${fetchPriority}" decoding="async" width="1920" height="1080">`;
      heroTrack.appendChild(div);
    });

    // Create transition bars for wipe effect
    const transitionLayer = document.createElement('div');
    transitionLayer.className = 'transition-bars';
    for (let i = 0; i < 6; i++) {
      const bar = document.createElement('div');
      bar.className = 'bar bar-' + i;
      transitionLayer.appendChild(bar);
    }
    if (!hero) return;
    hero.appendChild(transitionLayer);

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

    const prevSlideEl = slides[currentSlide];
    const nextSlideEl = slides[index];
    if (!hero) return;

    // 1. Black bars slide IN to cover the screen
    hero.classList.add('bars-in');

    // 2. When screen is completely covered (at 650ms), swap the image invisibly
    setTimeout(() => {
      prevSlideEl.classList.remove('active');
      dots[currentSlide].classList.remove('active');
      
      currentSlide = index;
      nextSlideEl.classList.add('active');
      dots[currentSlide].classList.add('active');

      // 3. Black bars slide OUT to reveal new image
      hero.classList.remove('bars-in');
      hero.classList.add('bars-out');

      // Reset auto-advance timer
      startCarouselTimer();
    }, HERO_WIPE_SWAP_MS);

    // 4. Clean up transition classes after animation finishes
    setTimeout(() => {
      hero.classList.remove('bars-out');
    }, HERO_WIPE_CLEANUP_MS);
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
  //  CURATED CAROUSEL
  // ==========================================
  function buildCuratedCarousel(curated) {
    const track = document.getElementById('curated-track');
    if (!track || !curated || curated.length === 0) return;

    let isDraggingCurated = false;

    // Helper to create item
    const createItem = (img) => {
      const item = document.createElement('div');
      item.className = 'curated-item';
      item.innerHTML = `<img src="${img.src}" alt="${img.alt}" loading="lazy" decoding="async" width="1200" height="900">`;
      
      item.addEventListener('click', () => {
        if (!isDraggingCurated) {
          openCuratedLightbox(img.src);
        }
      });
      return item;
    };

    // Append original set
    curated.forEach(img => track.appendChild(createItem(img)));
    // Append duplicated set for infinite scrolling
    curated.forEach(img => track.appendChild(createItem(img)));

    // Mouse drag to scroll functionality
    let isDown = false;
    let startX;
    let scrollLeft;
    let isHovering = false;

    track.addEventListener('mouseenter', () => isHovering = true);

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      isDraggingCurated = false;
      track.classList.add('dragging');
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });

    track.addEventListener('mouseleave', () => {
      isDown = false;
      isHovering = false;
      track.classList.remove('dragging');
    });

    track.addEventListener('mouseup', () => {
      isDown = false;
      track.classList.remove('dragging');
      setTimeout(() => { isDraggingCurated = false; }, 50);
    });

    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 2;
      if (Math.abs(walk) > 5) isDraggingCurated = true;
      track.scrollLeft = scrollLeft - walk;
    });

    // Auto-scroll runs only while curated track is visible to reduce background CPU.
    const autoScrollSpeed = 0.5; // pixels per frame
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isTrackVisible = false;
    let autoScrollRunning = false;
    let autoScrollRafId = null;

    const shouldRunAutoScroll = () => isTrackVisible && !document.hidden && !reduceMotion.matches;
    const stepAutoScroll = () => {
      if (!autoScrollRunning) return;
      if (!isDown && !isHovering) {
        track.scrollLeft += autoScrollSpeed;
        if (track.scrollLeft >= track.scrollWidth / 2) {
          track.scrollLeft -= track.scrollWidth / 2;
        }
      }
      autoScrollRafId = requestAnimationFrame(stepAutoScroll);
    };

    const startAutoScroll = () => {
      if (autoScrollRunning || !shouldRunAutoScroll()) return;
      autoScrollRunning = true;
      autoScrollRafId = requestAnimationFrame(stepAutoScroll);
    };

    const stopAutoScroll = () => {
      autoScrollRunning = false;
      if (autoScrollRafId) {
        cancelAnimationFrame(autoScrollRafId);
        autoScrollRafId = null;
      }
    };

    const visibilityObserver = new IntersectionObserver((entries) => {
      isTrackVisible = Boolean(entries[0]?.isIntersecting);
      if (shouldRunAutoScroll()) startAutoScroll();
      else stopAutoScroll();
    }, { threshold: 0.08 });
    visibilityObserver.observe(track);

    document.addEventListener('visibilitychange', () => {
      if (shouldRunAutoScroll()) startAutoScroll();
      else stopAutoScroll();
    });
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
      const count = (galleryData.gallery || []).filter((item) => item.category === cat).length;
      btn.innerHTML = `<span>${cat}</span><span class="filter-count">${String(count).padStart(2, '0')}</span>`;
      filterBar.appendChild(btn);
    });

    // Click handler
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      // Update active state
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeGalleryFilter = btn.dataset.filter;

      runGalleryLoadingForFilter(btn.dataset.filter);
    });
  }

  function applyFilter(category) {
    const items = galleryGrid.querySelectorAll('.gallery-item');
    visibleItems = [];

    items.forEach((item) => {
      const categoryMatch = category === 'ALL' || item.dataset.category === category;
      const query = gallerySearch ? gallerySearch.value.trim().toLocaleLowerCase() : '';
      const searchMatch = !query || `${item.dataset.title} ${item.dataset.category}`.toLocaleLowerCase().includes(query);
      const match = categoryMatch && searchMatch;
      if (match) {
        item.classList.remove('filtered-out');
        visibleItems.push(item);
      } else {
        item.classList.add('filtered-out');
      }
    });
    if (galleryCount) {
      const label = category === 'ALL' ? 'FRAMES' : `${category} · FRAMES`;
      galleryCount.textContent = `${String(visibleItems.length).padStart(2, '0')} ${label}`;
    }
  }

  function setupGallerySearch() {
    if (!gallerySearch) return;
    gallerySearch.addEventListener('input', () => applyFilter(activeGalleryFilter));
  }

  function setupGalleryProgress() {
    if (!galleryProgressBar) return;
    const section = document.getElementById('gallery');
    if (!section) return;
    let ticking = false;
    const update = () => {
      const rect = section.getBoundingClientRect();
      const travel = section.offsetHeight - window.innerHeight;
      const progress = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
      galleryProgressBar.style.transform = `scaleX(${progress})`;
      ticking = false;
    };
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        requestUpdate();
      } else {
        window.removeEventListener('scroll', requestUpdate);
        window.removeEventListener('resize', requestUpdate);
      }
    }, { rootMargin: '100% 0px' });
    visibilityObserver.observe(section);
  }

  // ==========================================
  //  GALLERY GRID
  // ==========================================
  function buildGallery(images) {
    if (!images || images.length === 0) return;

    images.forEach((img, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item reveal';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `${img.alt} — ${img.category} を拡大表示`);
      item.dataset.index = i;
      item.dataset.category = img.category;
      item.dataset.title = img.alt;
      item.dataset.materialize = ['orbit', 'scan', 'signal'][i % 3];

      item.innerHTML = `
        <img src="${img.src}" alt="${img.alt}" loading="lazy" decoding="async" width="900" height="1200">
        <div class="gallery-item-overlay">
          <span class="gallery-item-index">FRAME ${String(i + 1).padStart(2, '0')}</span>
          <span class="gallery-item-title">${img.alt}</span>
          <span class="gallery-item-category">${img.category}</span>
          <span class="gallery-item-open" aria-hidden="true">↗</span>
          <span class="gallery-item-serial" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        </div>
        <span class="gallery-item-tiles" aria-hidden="true"></span>
      `;

      const image = item.querySelector('img');
      item.classList.add('is-loading');
      const markImageReady = () => {
        item.classList.remove('is-loading');
        item.classList.add('image-ready');
        playGalleryTileReveal(item);
      };
      image.addEventListener('load', markImageReady, { once: true });
      image.addEventListener('error', () => {
        item.classList.remove('is-loading');
        item.classList.add('is-error');
      }, { once: true });
      if (image.complete && image.naturalWidth > 0) markImageReady();

      item.addEventListener('click', () => openLightbox(i));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLightbox(i);
        }
      });
      galleryGrid.appendChild(item);
    });

    // Initialize visible items
    visibleItems = Array.from(galleryGrid.querySelectorAll('.gallery-item'));
  }

  function setupGalleryDepth() {
    if (!galleryGrid) return;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || (connection && connection.saveData)) {
      galleryGrid.classList.add('low-motion');
      return;
    }
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let activeItem = null;
    let pointerX = 0;
    let pointerY = 0;
    galleryGrid.addEventListener('pointermove', (event) => {
      const item = event.target.closest('.gallery-item');
      if (!item || item.classList.contains('filtered-out')) return;
      activeItem = item;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        if (!activeItem) { frame = 0; return; }
        const rect = activeItem.getBoundingClientRect();
        const x = (pointerX - rect.left) / rect.width - 0.5;
        const y = (pointerY - rect.top) / rect.height - 0.5;
        activeItem.style.setProperty('--tilt-x', `${(x * 3.2).toFixed(2)}deg`);
        activeItem.style.setProperty('--tilt-y', `${(-y * 3.2).toFixed(2)}deg`);
        activeItem.style.setProperty('--shine-x', `${((x + 0.5) * 100).toFixed(1)}%`);
        activeItem.style.setProperty('--shine-y', `${((y + 0.5) * 100).toFixed(1)}%`);
        frame = 0;
      });
    }, { passive: true });
    galleryGrid.addEventListener('pointerout', (event) => {
      const item = event.target.closest('.gallery-item');
      if (!item || item.contains(event.relatedTarget)) return;
      item.style.removeProperty('--tilt-x');
      item.style.removeProperty('--tilt-y');
      item.style.removeProperty('--shine-x');
      item.style.removeProperty('--shine-y');
      if (activeItem === item) activeItem = null;
    }, { passive: true });
  }

  function setupGalleryNumberParallax() {
    if (!galleryGrid || galleryGrid.classList.contains('low-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const numbers = Array.from(galleryGrid.querySelectorAll('.gallery-item-serial'));
    if (!numbers.length || !('IntersectionObserver' in window)) return;

    const activeNumbers = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeNumbers.add(entry.target);
          entry.target.style.willChange = 'transform';
        } else {
          activeNumbers.delete(entry.target);
          entry.target.style.willChange = '';
        }
      });
    }, { rootMargin: '100px 0px' });
    numbers.forEach((number) => observer.observe(number));

    addRafScrollListener(() => {
      const viewportCenter = window.innerHeight / 2;
      activeNumbers.forEach((number) => {
        const rect = number.getBoundingClientRect();
        const distance = (viewportCenter - (rect.top + rect.height / 2)) / viewportCenter;
        const offset = Math.max(-18, Math.min(18, distance * 18));
        number.style.setProperty('--serial-scroll-y', `${offset.toFixed(1)}px`);
      });
    });
  }

  function playGalleryTileReveal(item) {
    if (!galleryGrid || galleryGrid.classList.contains('low-motion')) return;
    if (!item.classList.contains('visible') || !item.classList.contains('image-ready') || item.dataset.tilesPlayed) return;

    const image = item.querySelector('img');
    const layer = item.querySelector('.gallery-item-tiles');
    if (!image || !layer || !image.naturalWidth || !image.naturalHeight) return;

    item.dataset.tilesPlayed = 'true';
    const rect = item.getBoundingClientRect();
    let columns = Math.max(6, Math.min(22, Math.round(rect.width / tileProfile.edge)));
    let rows = Math.max(7, Math.min(26, Math.round(rect.height / tileProfile.edge)));
    const tileBudget = tileProfile.budget;
    while (columns * rows > tileBudget) {
      if (rect.width / columns < rect.height / rows) columns -= 1;
      else rows -= 1;
    }
    const maxRadial = Math.hypot((columns - 1) / 2, (rows - 1) / 2);
    const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const renderWidth = image.naturalWidth * scale;
    const renderHeight = image.naturalHeight * scale;
    const cropX = (renderWidth - rect.width) / 2;
    const cropY = (renderHeight - rect.height) / 2;
    const tileWidth = rect.width / columns;
    const tileHeight = rect.height / rows;
    let finishedTiles = 0;
    let cleanupTimer;
    const fragment = document.createDocumentFragment();
    const finishReveal = () => {
      if (!layer.isConnected) return;
      window.clearTimeout(cleanupTimer);
      layer.remove();
      item.classList.remove('tiles-revealing');
    };

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const tile = document.createElement('span');
        const horizontal = column - (columns - 1) / 2;
        const vertical = row - (rows - 1) / 2;
        const seed = Math.sin((row + 1) * 12.9898 + (column + 1) * 78.233) * 43758.5453;
        const noise = seed - Math.floor(seed);
        const radial = Math.hypot(horizontal, vertical) || 1;
        let fromX;
        let fromY;
        let rotation;
        let delay;

        if (item.dataset.materialize === 'orbit') {
          fromX = (horizontal / radial) * (22 + noise * 24);
          fromY = (vertical / radial) * (22 + noise * 24);
          rotation = (noise - .5) * 18;
          delay = (1 - radial / maxRadial) * 330 + noise * 90;
        } else if (item.dataset.materialize === 'scan') {
          const direction = column % 2 === 0 ? -1 : 1;
          fromX = direction * (18 + noise * 18);
          fromY = (noise - .5) * 10;
          rotation = direction * (1.5 + noise * 3.5);
          delay = (row / Math.max(1, rows - 1)) * 420 + column * 3.5;
        } else {
          fromX = (noise - .5) * 72;
          fromY = (Math.cos((row + 1) * (column + 2)) * 14) + (noise - .5) * 36;
          rotation = (noise - .5) * 20;
          delay = noise * 360;
        }

        tile.className = 'gallery-pixel-tile';
        tile.style.left = `${column * 100 / columns}%`;
        tile.style.top = `${row * 100 / rows}%`;
        tile.style.width = `${100 / columns}%`;
        tile.style.height = `${100 / rows}%`;
        tile.style.backgroundImage = `url("${image.currentSrc || image.src}")`;
        tile.style.backgroundSize = `${renderWidth}px ${renderHeight}px`;
        tile.style.backgroundPosition = `${-cropX - column * tileWidth}px ${-cropY - row * tileHeight}px`;
        tile.style.setProperty('--tile-from-x', `${fromX.toFixed(1)}px`);
        tile.style.setProperty('--tile-from-y', `${fromY.toFixed(1)}px`);
        tile.style.setProperty('--tile-mid-x', `${(fromX * .32).toFixed(1)}px`);
        tile.style.setProperty('--tile-mid-y', `${(fromY * .32).toFixed(1)}px`);
        tile.style.setProperty('--tile-rotation', `${rotation.toFixed(1)}deg`);
        tile.style.setProperty('--tile-mid-rotation', `${(rotation * .24).toFixed(1)}deg`);
        tile.style.setProperty('--tile-delay', `${Math.round(delay)}ms`);
        tile.addEventListener('animationend', () => {
          finishedTiles += 1;
          if (finishedTiles === columns * rows) finishReveal();
        }, { once: true });
        fragment.appendChild(tile);
      }
    }

    item.classList.add('tiles-revealing');
    layer.appendChild(fragment);
    cleanupTimer = window.setTimeout(finishReveal, 2600);
  }

  // ==========================================
  //  THROWBACK BANNER
  // ==========================================
  function buildThrowback(items) {
    if (!throwbackSection || !throwbackBanner) return;
    if (!Array.isArray(items) || items.length === 0) {
      throwbackSection.hidden = true;
      return;
    }

    throwbackSection.hidden = false;
    const firstGalleryImage = Array.isArray(items) && items[0]
      ? items[0].src
      : null;
    if (firstGalleryImage) {
      throwbackBanner.dataset.hasParallaxBg = '1';
      throwbackBanner.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.58), rgba(0,0,0,0.12)), url("${firstGalleryImage}")`;
      throwbackBanner.style.backgroundSize = 'cover, 112%';
      throwbackBanner.style.backgroundPosition = 'center, center';
    } else {
      throwbackBanner.dataset.hasParallaxBg = '0';
      throwbackBanner.style.backgroundImage = 'linear-gradient(120deg, rgba(255,255,255,0.06) 0%, transparent 35%), #0f0f0f';
      throwbackBanner.style.backgroundSize = 'auto';
      throwbackBanner.style.backgroundPosition = '0 0';
    }
    throwbackBanner.style.backgroundRepeat = 'no-repeat';
    throwbackBanner.addEventListener('click', () => openThrowback(0));
    const throwbackLabel = throwbackBanner.querySelector('.throwback-banner-label');
    if (throwbackLabel) {
      throwbackLabel.dataset.text = throwbackLabel.textContent || 'OPEN ARCHIVE';
      setupThrowbackLabelGlitch(throwbackLabel);
    }
    setupThrowbackBannerParallax();
    setupThrowbackBannerLabelReveal();
  }

  function setupThrowbackLabelGlitch(labelEl) {
    const originalText = (labelEl.textContent || 'OPEN ARCHIVE').trim();
    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    let running = false;

    const runTypeGlitch = () => {
      if (running) return;
      running = true;
      labelEl.classList.add('is-glitching');
      const durationMs = 260;
      const stepMs = 42;
      const start = performance.now();

      const tick = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(1, elapsed / durationMs);
        const keepCount = Math.floor(originalText.length * progress);

        let nextText = '';
        for (let i = 0; i < originalText.length; i++) {
          if (originalText[i] === ' ') {
            nextText += ' ';
            continue;
          }
          if (i < keepCount) {
            nextText += originalText[i];
          } else {
            nextText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          }
        }
        labelEl.textContent = nextText;

        if (progress < 1) {
          window.setTimeout(tick, stepMs);
        } else {
          labelEl.textContent = originalText;
          labelEl.classList.remove('is-glitching');
          running = false;
        }
      };
      tick();
    };

    let timerId = null;
    const schedule = () => {
      if (document.hidden) {
        timerId = null;
        return;
      }
      const nextInMs = 2200 + Math.random() * 3400;
      timerId = window.setTimeout(() => {
        runTypeGlitch();
        window.setTimeout(() => {
          schedule();
        }, 260);
      }, nextInMs);
    };
    schedule();
    labelEl.addEventListener('mouseenter', () => {
      runTypeGlitch();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (timerId) clearTimeout(timerId);
        timerId = null;
      } else if (!timerId) {
        schedule();
      }
    });
    window.addEventListener('beforeunload', () => {
      if (timerId) clearTimeout(timerId);
    });
  }

  function buildBehindTheFrame(items) {
    if (!behindGrid) return;
    behindGrid.innerHTML = '';
    if (!Array.isArray(items) || !items.length) return;

    const featured = items
      .filter((item) => item && item.isPublished && item.isFeatured)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .slice(0, 3);

    featured.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'behind-card reveal';
      card.dataset.index = String(index);

      const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
      const linkedWork = item.linkedWork ? `<p class="behind-notes">Linked work: ${item.linkedWork}</p>` : '';
      const notes = item.notes ? `<p class="behind-notes">${item.notes}</p>` : '';
      const tagsHtml = tags.length
        ? `<div class="behind-tags">${tags.map((tag) => `<span class="behind-tag">${tag}</span>`).join('')}</div>`
        : '';

      const showFull = (item.visibilityLevel || 'public') === 'public' && item.fullPrompt;
      const fullId = `behind-full-${index}`;
      const fullHtml = showFull
        ? `<div class="behind-full" id="${fullId}" hidden>${item.fullPrompt}</div>`
        : '';
      const toggleHtml = showFull
        ? `<button class="behind-toggle" type="button" aria-expanded="false" aria-controls="${fullId}">View full prompt</button>`
        : '';

      card.innerHTML = `
        ${item.image ? `<img class="behind-image" src="${item.image}" alt="${item.title || 'Behind the Frame'}" loading="lazy" decoding="async" width="1200" height="900">` : ''}
        <div class="behind-body">
          ${item.title ? `<h3 class="behind-title">${item.title}</h3>` : ''}
          ${item.promptPreview ? `<p class="behind-preview">${item.promptPreview}</p>` : ''}
          ${toggleHtml}
          ${fullHtml}
          ${notes}
          ${linkedWork}
          ${tagsHtml}
        </div>
      `;

      if (showFull) {
        const toggleBtn = card.querySelector('.behind-toggle');
        const full = card.querySelector('.behind-full');
        if (toggleBtn && full) {
          toggleBtn.addEventListener('click', () => {
            const opening = full.hasAttribute('hidden');
            if (opening) {
              full.removeAttribute('hidden');
              toggleBtn.textContent = 'Hide full prompt';
            } else {
              full.setAttribute('hidden', '');
              toggleBtn.textContent = 'View full prompt';
            }
            toggleBtn.setAttribute('aria-expanded', opening ? 'true' : 'false');
          });
        }
      }

      behindGrid.appendChild(card);
    });
  }

  function setupThrowbackBannerParallax() {
    if (!throwbackSection || !throwbackBanner || throwbackBanner.dataset.hasParallaxBg !== '1') return;

    const update = () => {
      const rect = throwbackSection.getBoundingClientRect();
      const windowH = window.innerHeight;
      if (rect.bottom > 0 && rect.top < windowH) {
        const progress = (windowH - rect.top) / (windowH + rect.height);
        const centered = progress - 0.5;
        const bgOffsetY = centered * 90;
        const bgScale = 112 + Math.abs(centered) * 10;
        throwbackBanner.style.backgroundPosition = `center, center calc(50% + ${bgOffsetY}px)`;
        throwbackBanner.style.backgroundSize = `cover, ${bgScale}%`;
      }
    };

    addRafScrollListener(update);

    update();
  }

  function setupThrowbackBannerLabelReveal() {
    if (!throwbackSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            throwbackSection.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.2,
      }
    );

    observer.observe(throwbackSection);
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
    lightboxMode = 'gallery';
    lightboxIndex = index;
    updateLightboxImage();
    openOverlay(lightbox);
  }

  function openCuratedLightbox(src) {
    const curatedItems = Array.isArray(galleryData.curated) ? galleryData.curated : [];
    const index = curatedItems.findIndex((item) => item.src === src);
    if (index < 0) return;
    lightboxMode = 'curated';
    lightboxIndex = index;
    updateLightboxImage();
    openOverlay(lightbox);
  }

  function closeLightbox() {
    closeOverlay(lightbox, 400);
  }

  function navigateLightbox(dir) {
    if (lightboxMode === 'curated') {
      const items = Array.isArray(galleryData.curated) ? galleryData.curated : [];
      if (!items.length) return;
      lightboxIndex = (lightboxIndex + dir + items.length) % items.length;
    } else {
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
    }
    updateLightboxImage();
  }

  function updateLightboxImage() {
    const source = lightboxMode === 'curated'
      ? (Array.isArray(galleryData.curated) ? galleryData.curated : [])
      : (Array.isArray(galleryData.gallery) ? galleryData.gallery : []);
    const img = source[lightboxIndex];
    if (!img) return;
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxInfo.querySelector('.lightbox-title').textContent = img.alt;
    lightboxInfo.querySelector('.lightbox-category').textContent =
      lightboxMode === 'curated' ? 'CURATED' : img.category;
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
  //  THROWBACK LIGHTBOX
  // ==========================================
  function setupThrowbackLightbox() {
    if (!throwbackLightbox || !throwbackClose || !throwbackPrev || !throwbackNext) return;

    throwbackClose.addEventListener('click', closeThrowback);
    throwbackPrev.addEventListener('click', () => navigateThrowback(-1));
    throwbackNext.addEventListener('click', () => navigateThrowback(1));
    throwbackLightbox.querySelector('.throwback-backdrop').addEventListener('click', closeThrowback);
    throwbackLightbox.addEventListener('touchstart', onThrowbackTouchStart, { passive: true });
    throwbackLightbox.addEventListener('touchend', onThrowbackTouchEnd, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (!throwbackLightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeThrowback();
      if (e.key === 'ArrowLeft') navigateThrowback(-1);
      if (e.key === 'ArrowRight') navigateThrowback(1);
    });
  }

  function openThrowback(index) {
    const items = getThrowbackItems();
    if (!items.length || !throwbackLightbox) return;

    throwbackIndex = index;
    updateThrowbackImage();
    openOverlay(throwbackLightbox);
  }

  function closeThrowback() {
    closeOverlay(throwbackLightbox, 350);
  }

  function navigateThrowback(dir) {
    const items = getThrowbackItems();
    if (!items.length) return;

    throwbackIndex = (throwbackIndex + dir + items.length) % items.length;
    updateThrowbackImage();
  }

  function updateThrowbackImage() {
    const items = getThrowbackItems();
    const item = items[throwbackIndex];
    if (!item) return;

    throwbackImage.src = item.src;
    throwbackImage.alt = item.alt || 'Throwback image';
    throwbackTitle.textContent = item.alt || `Throwback ${throwbackIndex + 1}`;
    throwbackCounter.textContent = `${throwbackIndex + 1} / ${items.length}`;
  }

  function onThrowbackTouchStart(e) {
    throwbackTouchStartX = e.changedTouches[0].clientX;
  }

  function onThrowbackTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - throwbackTouchStartX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      navigateThrowback(dx < 0 ? 1 : -1);
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
              playGalleryTileReveal(item);
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

  // ==========================================
  //  VIDEO PARALLAX
  // ==========================================
  function setupVideoParallax() {
    const videoSection = document.getElementById('video-section');
    const videoWrapper = videoSection ? videoSection.querySelector('.video-parallax-wrapper') : null;
    if (!videoSection || !videoWrapper) return;

    addRafScrollListener(() => {
      const rect = videoSection.getBoundingClientRect();
      const windowH = window.innerHeight;
      // Only animate when section is in view
      if (rect.bottom > 0 && rect.top < windowH) {
        const progress = (windowH - rect.top) / (windowH + rect.height);
        const offset = (progress - 0.5) * 20; // -10% to +10% range
        videoWrapper.style.transform = `translateY(${offset}%)`;
      }
    });
  }

  // ==========================================
  //  INTERLUDE PARALLAX
  // ==========================================
  function setupInterludeParallax() {
    const sections = Array.from(document.querySelectorAll('.interlude-section'));
    if (!sections.length) return;

    const interludeItems = Array.isArray(galleryData.interlude) && galleryData.interlude.length
      ? galleryData.interlude
      : (Array.isArray(galleryData.gallery) ? galleryData.gallery : []);
    sections.forEach((section, index) => {
      const item = interludeItems[index];
      if (item && item.src) {
        section.dataset.hasParallaxBg = '1';
        section.style.backgroundImage = `linear-gradient(135deg, rgba(7,7,7,0.74) 0%, rgba(19,19,19,0.56) 55%, rgba(9,9,9,0.74) 100%), url("${item.src}")`;
        section.style.backgroundSize = 'cover, 108%';
        section.style.backgroundPosition = 'center, center';
      }
    });

    const update = () => {
      const windowH = window.innerHeight;

      sections.forEach((section, sectionIndex) => {
        const rect = section.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < windowH) {
          const progress = (windowH - rect.top) / (windowH + rect.height);
          const centered = progress - 0.5;
          if (section.dataset.hasParallaxBg === '1') {
            const bgOffsetY = centered * 140;
            const bgScale = 108 + Math.abs(centered) * 16;
            section.style.backgroundPosition = `center, center calc(50% + ${bgOffsetY}px)`;
            section.style.backgroundSize = `cover, ${bgScale}%`;
          }
          section.querySelectorAll('[data-speed]').forEach((el) => {
            const speed = Number(el.dataset.speed || 0);
            const phase = sectionIndex % 2 === 0 ? 1 : -1;
            const scale = 1 + Math.abs(centered * speed) * 0.34;

            if (el.classList.contains('interlude-content')) {
              const offsetY = centered * speed * 380;
              const offsetX = centered * speed * 980 * phase;
              el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
            } else {
              const offsetY = centered * speed * 760;
              el.style.transform = `translate3d(0, ${offsetY}px, 0) scale(${scale})`;
            }
          });
        }
      });
    };

    addRafScrollListener(update);

    update();
  }

  // ==========================================
  //  BGM CONTROLLER
  // ==========================================
  function setupBGM() {
    const bgmAudio = document.getElementById('bgm-audio');
    const soundToggleBtn = document.getElementById('sound-toggle');
    const soundState = document.getElementById('sound-state');
    const soundDrawer = document.getElementById('sound-drawer');
    const soundDrawerToggle = document.getElementById('sound-drawer-toggle');
    const soundSelect = document.getElementById('sound-select');
    const soundTrackTitle = document.getElementById('sound-track-title');
    
    if (!bgmAudio || !soundToggleBtn || !soundState || !soundDrawer || !soundDrawerToggle || !soundSelect || !soundTrackTitle) return;
    bgmAudio.preload = 'auto';

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;
    let webAudioSource = null;
    let webAudioGain = null;
    const decodedAudioBuffers = new Map();

    const getAudioSrc = () => bgmAudio.getAttribute('src') || soundSelect.value;
    const getAudioContext = () => {
      if (!AudioContextClass) return null;
      if (!audioContext) audioContext = new AudioContextClass();
      return audioContext;
    };
    const loadAudioBuffer = async (src) => {
      const context = getAudioContext();
      if (!context) return null;
      if (decodedAudioBuffers.has(src)) return decodedAudioBuffers.get(src);

      const response = await fetch(src);
      if (!response.ok) throw new Error(`Audio fetch failed: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);
      decodedAudioBuffers.set(src, audioBuffer);
      return audioBuffer;
    };
    const stopWebAudio = () => {
      if (!webAudioSource) return;
      webAudioSource.onended = null;
      webAudioSource.stop();
      webAudioSource.disconnect();
      webAudioSource = null;
    };
    const playWebAudio = async () => {
      const context = getAudioContext();
      if (!context) return false;
      const audioBuffer = await loadAudioBuffer(getAudioSrc());
      if (context.state === 'suspended') await context.resume();

      stopWebAudio();
      if (!webAudioGain) {
        webAudioGain = context.createGain();
        webAudioGain.connect(context.destination);
      }

      webAudioSource = context.createBufferSource();
      webAudioSource.buffer = audioBuffer;
      webAudioSource.loop = true;
      webAudioSource.connect(webAudioGain);
      webAudioSource.start(0);
      return true;
    };
    const playCurrentTrack = () => {
      return playWebAudio().catch((err) => {
        console.warn("Web Audio playback failed, falling back to HTML audio:", err);
        stopWebAudio();
        return false;
      }).then((playedWithWebAudio) => {
        if (playedWithWebAudio) return;
        return bgmAudio.play();
      });
    };

    // MP3 files can include encoder padding, but OGG usually loops cleanly natively.
    // Only apply the early seek where it helps, otherwise let the browser loop it.
    let seamlessLoopLock = false;
    const mp3LoopThresholdSec = 0.30;
    let seamlessMonitorFrame = null;
    const getLoopThresholdSec = () => {
      const src = (bgmAudio.currentSrc || bgmAudio.getAttribute('src') || '').split('?')[0].toLowerCase();
      return src.endsWith('.mp3') ? mp3LoopThresholdSec : 0;
    };
    const isSoundPlaying = () => soundToggleBtn.classList.contains('is-playing') && (webAudioSource || !bgmAudio.paused);
    const startSeamlessMonitor = () => {
      if (getLoopThresholdSec() <= 0) return;
      if (seamlessMonitorFrame) return;
      const monitor = () => {
        seamlessMonitorFrame = null;
        maybeSeekLoopHead();
        if (isSoundPlaying() && getLoopThresholdSec() > 0) {
          seamlessMonitorFrame = requestAnimationFrame(monitor);
        }
      };
      seamlessMonitorFrame = requestAnimationFrame(monitor);
    };
    const stopSeamlessMonitor = () => {
      if (!seamlessMonitorFrame) return;
      cancelAnimationFrame(seamlessMonitorFrame);
      seamlessMonitorFrame = null;
    };
    const maybeSeekLoopHead = () => {
      if (!isSoundPlaying() || seamlessLoopLock) return;
      if (!Number.isFinite(bgmAudio.duration) || bgmAudio.duration <= 0) return;
      const loopThresholdSec = getLoopThresholdSec();
      if (loopThresholdSec <= 0) return;
      if (bgmAudio.currentTime >= bgmAudio.duration - loopThresholdSec) {
        seamlessLoopLock = true;
        bgmAudio.currentTime = 0;
        seamlessLoopLock = false;
      }
    };
    bgmAudio.addEventListener('play', startSeamlessMonitor);
    bgmAudio.addEventListener('pause', stopSeamlessMonitor);
    bgmAudio.addEventListener('ended', stopSeamlessMonitor);
    bgmAudio.addEventListener('emptied', stopSeamlessMonitor);

    const updateTrackTitle = () => {
      const selectedOption = soundSelect.options[soundSelect.selectedIndex];
      const title = selectedOption ? selectedOption.text : '';
      soundTrackTitle.innerHTML = `<span>Now playing: ${title}</span>`;
    };

    const syncSelectionFromAudio = () => {
      const currentSrc = bgmAudio.getAttribute('src');
      for (let i = 0; i < soundSelect.options.length; i++) {
        if (soundSelect.options[i].value === currentSrc) {
          soundSelect.selectedIndex = i;
          break;
        }
      }
      updateTrackTitle();
    };

    syncSelectionFromAudio();

    const toggleSoundDrawer = () => {
      const isOpen = soundDrawer.classList.toggle('open');
      soundDrawerToggle.textContent = isOpen ? '<' : '>';
      soundDrawerToggle.setAttribute('aria-label', isOpen ? 'Close music selector' : 'Open music selector');
    };

    soundDrawerToggle.addEventListener('click', toggleSoundDrawer);
    soundDrawer.addEventListener('click', (e) => {
      if (e.target === soundSelect) return;
      toggleSoundDrawer();
    });

    soundToggleBtn.addEventListener('click', () => {
      if (!isSoundPlaying()) {
        playCurrentTrack().then(() => {
          soundToggleBtn.classList.add('is-playing');
          soundState.textContent = 'ON';
          startSeamlessMonitor();
        }).catch((err) => {
          console.error("Audio playback failed:", err);
        });
      } else {
        stopWebAudio();
        bgmAudio.pause();
        soundToggleBtn.classList.remove('is-playing');
        soundState.textContent = 'OFF';
        stopSeamlessMonitor();
      }
    });

    soundSelect.addEventListener('change', () => {
      const nextSrc = soundSelect.value;
      const wasPlaying = isSoundPlaying();

      stopSeamlessMonitor();
      stopWebAudio();
      bgmAudio.pause();
      bgmAudio.src = nextSrc;
      bgmAudio.loop = true;
      updateTrackTitle();

      if (wasPlaying) {
        playCurrentTrack().then(() => {
          soundToggleBtn.classList.add('is-playing');
          soundState.textContent = 'ON';
          startSeamlessMonitor();
        }).catch((err) => {
          console.error("Audio playback failed:", err);
          soundToggleBtn.classList.remove('is-playing');
          soundState.textContent = 'OFF';
          stopSeamlessMonitor();
        });
      }

      // Close selector after picking a track and reset toggle glyph.
      soundDrawer.classList.remove('open');
      soundDrawerToggle.textContent = '>';
      soundDrawerToggle.setAttribute('aria-label', 'Open music selector');
    });
  }

  // ==========================================
  //  PAGE TOP BUTTON
  // ==========================================
  function setupPageTopButton() {
    const pageTopBtn = document.getElementById('page-top');
    if (!pageTopBtn) return;

    const toggleVisibility = () => {
      const shouldShow = window.scrollY > 500;
      pageTopBtn.classList.toggle('show', shouldShow);
    };

    pageTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();
  }

  // ---------- BOOT ----------
  enforceTopOnReload();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
