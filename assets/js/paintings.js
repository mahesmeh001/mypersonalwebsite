(function () {
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("painting-lightbox");
  const filterTrigger = document.getElementById("filter-trigger");
  const filterMenu = document.getElementById("filter-menu");
  const filterChips = document.getElementById("filter-chips");
  const galleryEmpty = document.getElementById("gallery-empty");
  if (!gallery || !lightbox || typeof PAINTINGS === "undefined") return;
  if (!filterTrigger || !filterMenu || !filterChips || !galleryEmpty) return;

  const VALID_SIZES = ["small", "medium", "large"];
  const FILTER_TRANSITION_MS = 480;

  // Desktop: fluid masonry fractions (~Rpatelart / Mike Svob).
  const SIZE_RANGES_DESKTOP = {
    small:  { min: 0.25, max: 0.25, steps: 1 },
    medium: { min: 0.28, max: 0.31, steps: 2 },
    large:  { min: 0.32, max: 0.36, steps: 2 },
  };

  const paintings = PAINTINGS.filter(function (p) {
    return !p.draft;
  });
  const activeFilters = new Set();
  const layoutCache = new Map();
  let lastLayoutViewportKey = "";
  let currentIndex = 0;

  const lbImage = lightbox.querySelector(".lightbox-image-wrap img");
  const lbTitle = lightbox.querySelector(".lightbox-info h2");
  const lbMeta = lightbox.querySelector(".lightbox-meta");
  const lbDescription = lightbox.querySelector(".lightbox-description");
  const lbNotes = lightbox.querySelector(".lightbox-notes");
  const lbCounter = lightbox.querySelector(".lightbox-counter");
  const btnClose = lightbox.querySelector(".lightbox-close");
  const btnPrev = lightbox.querySelector(".lightbox-prev");
  const btnNext = lightbox.querySelector(".lightbox-next");

  function slugify(title) {
    return title
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function paintingCategories(p) {
    return Array.isArray(p.category) ? p.category.filter(Boolean) : [];
  }

  function getUniqueCategories() {
    const categories = new Set();
    paintings.forEach(function (p) {
      paintingCategories(p).forEach(function (category) {
        categories.add(category);
      });
    });
    return Array.from(categories).sort();
  }

  function matchesFilters(p) {
    if (activeFilters.size === 0) return true;
    const categories = paintingCategories(p);
    for (const filter of activeFilters) {
      if (!categories.includes(filter)) return false;
    }
    return true;
  }

  function getVisiblePaintings() {
    return paintings.filter(matchesFilters);
  }

  function paintingIndex(p) {
    return paintings.findIndex(function (item) {
      return item.title === p.title;
    });
  }

  function metaParts(p) {
    return [p.dimensions, p.cost].filter(Boolean);
  }

  function overlayText(p) {
    const parts = metaParts(p);
    return parts.length ? parts.join(" · ") : "";
  }

  function paintingSize(p) {
    const size = String(p.size || "medium").toLowerCase();
    return VALID_SIZES.includes(size) ? size : "medium";
  }

  function paintingPriority(p) {
    const priority = Number(p.priority);
    return Number.isFinite(priority) ? priority : 10;
  }

  function getViewportTier() {
    const width = window.innerWidth;
    if (width <= 540) return "phone";
    if (width <= 900) return "tablet";
    return "desktop";
  }

  function columnFraction(config) {
    const totalGap = (config.gridCols - 1) * config.gapX;
    const colWidth = (config.containerWidth - totalGap) / config.gridCols;
    return colWidth / config.containerWidth;
  }

  function getSizeRanges(config) {
    const col = columnFraction(config);

    if (config.tier === "phone") {
      // One column for small/medium; large spans the full row.
      return {
        small:  { min: col, max: col, steps: 1 },
        medium: { min: col, max: col, steps: 1 },
        large:  { min: 0.98, max: 1, steps: 1 },
      };
    }

    if (config.tier === "tablet") {
      // Two columns: small/medium use one column; large uses ~1.5–2 columns.
      const wide = Math.min(1, col * 1.55 + config.gapX / config.containerWidth);
      return {
        small:  { min: col, max: col, steps: 1 },
        medium: { min: col, max: col * 1.04, steps: 2 },
        large:  { min: wide * 0.92, max: wide, steps: 2 },
      };
    }

    return SIZE_RANGES_DESKTOP;
  }

  function effectivePriority(p, tier) {
    const base = paintingPriority(p);
    const sizeKey = paintingSize(p);

    if (tier === "phone") {
      const sizeBoost = { large: 100, medium: 50, small: 0 };
      return (sizeBoost[sizeKey] || 0) + base;
    }

    if (tier === "tablet") {
      const sizeBoost = { large: 35, medium: 15, small: 0 };
      return (sizeBoost[sizeKey] || 0) + base;
    }

    return base;
  }

  function readLengthPx(property, fallbackPx) {
    const raw = getComputedStyle(gallery).getPropertyValue(property).trim();
    if (!raw) return fallbackPx;

    const probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:0;width:" + raw;
    gallery.appendChild(probe);
    const px = probe.getBoundingClientRect().width;
    gallery.removeChild(probe);
    return px > 0 ? px : fallbackPx;
  }

  function getLayoutConfig() {
    const style = getComputedStyle(gallery);
    const gridCols = parseInt(style.getPropertyValue("--grid-cols"), 10) || 3;
    const gapX = readLengthPx("--gap-x", 24);
    const gapY = readLengthPx("--gap-y", 24);
    const containerWidth = gallery.clientWidth;
    const tier = getViewportTier();
    const sizeRanges = getSizeRanges({ gridCols, gapX, gapY, containerWidth, tier });
    return { gridCols, gapX, gapY, containerWidth, tier, sizeRanges };
  }

  function layoutViewportKey(config) {
    return (
      config.tier +
      ":" +
      Math.round(config.containerWidth) +
      ":" +
      config.gridCols +
      ":" +
      Math.round(config.gapX) +
      ":" +
      Math.round(config.gapY)
    );
  }

  function syncLayoutCacheViewport(config) {
    const viewportKey = layoutViewportKey(config);
    if (viewportKey !== lastLayoutViewportKey) {
      layoutCache.clear();
      lastLayoutViewportKey = viewportKey;
    }
    return viewportKey;
  }

  function layoutSetKey(config, cards) {
    return (
      syncLayoutCacheViewport(config) +
      ":" +
      cards
        .map(function (card) {
          return card.dataset.index;
        })
        .sort()
        .join(",")
    );
  }

  function readCardLayout(card) {
    return {
      x: parseFloat(card.dataset.layoutX) || 0,
      y: parseFloat(card.dataset.layoutY) || 0,
      w: parseFloat(card.dataset.layoutW) || card.offsetWidth,
      h: card.offsetHeight,
    };
  }

  function saveLayoutCache(key, cards) {
    const positions = new Map();
    cards.forEach(function (card) {
      positions.set(card.dataset.index, readCardLayout(card));
    });
    layoutCache.set(key, positions);
  }

  function hasLayoutCache(key, cards) {
    const positions = layoutCache.get(key);
    if (!positions) return false;
    return cards.every(function (card) {
      return positions.has(card.dataset.index);
    });
  }

  function applyLayoutFromCache(key, cards, config) {
    const positions = layoutCache.get(key);
    if (!positions) return false;
    if (!hasLayoutCache(key, cards)) return false;

    let maxBottom = 0;
    cards.forEach(function (card) {
      const pos = positions.get(card.dataset.index);
      card.style.width = pos.w + "px";
      card.dataset.layoutX = String(pos.x);
      card.dataset.layoutY = String(pos.y);
      card.dataset.layoutW = String(pos.w);
      card.style.transform =
        "translate3d(" + pos.x + "px, " + pos.y + "px, 0)";
      maxBottom = Math.max(maxBottom, pos.y + pos.h);
    });

    gallery.style.height = (maxBottom > 0 ? maxBottom + config.gapY : 0) + "px";
    return true;
  }

  function candidateWidths(sizeKey, config) {
    const range = config.sizeRanges[sizeKey];
    const widths = [];
    const steps = Math.max(1, range.steps);

    for (let i = 0; i < steps; i++) {
      const t = steps === 1 ? 0 : i / (steps - 1);
      const fraction = range.min + t * (range.max - range.min);
      widths.push({
        fraction: fraction,
        width: Math.round(fraction * config.containerWidth),
      });
    }

    return widths;
  }

  function heightForWidth(img, width) {
    if (!img.naturalWidth || !img.naturalHeight) return width;
    return width * (img.naturalHeight / img.naturalWidth);
  }

  function rectContains(outer, inner) {
    return (
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.w <= outer.x + outer.w &&
      inner.y + inner.h <= outer.y + outer.h
    );
  }

  function rectsCollide(a, b) {
    return !(
      a.x + a.w <= b.x ||
      b.x + b.w <= a.x ||
      a.y + a.h <= b.y ||
      b.y + b.h <= a.y
    );
  }

  function paddedRect(rect, gapX, gapY) {
    return {
      x: rect.x,
      y: rect.y,
      w: rect.w + gapX,
      h: rect.h + gapY,
    };
  }

  function fitsInFree(inner, free) {
    return inner.w <= free.w + 0.5 && inner.h <= free.h + 0.5;
  }

  function collidesWithPlaced(candidate, placedRects) {
    for (let i = 0; i < placedRects.length; i++) {
      if (rectsCollide(candidate, placedRects[i])) return true;
    }
    return false;
  }

  function splitFreeRect(free, placed, gapX, gapY) {
    const block = paddedRect(placed, gapX, gapY);
    const results = [];

    if (!rectsCollide(free, block)) {
      return [free];
    }

    if (block.x > free.x) {
      results.push({
        x: free.x,
        y: free.y,
        w: block.x - free.x,
        h: free.h,
      });
    }

    if (block.x + block.w < free.x + free.w) {
      results.push({
        x: block.x + block.w,
        y: free.y,
        w: free.x + free.w - (block.x + block.w),
        h: free.h,
      });
    }

    if (block.y > free.y) {
      results.push({
        x: free.x,
        y: free.y,
        w: free.w,
        h: block.y - free.y,
      });
    }

    if (block.y + block.h < free.y + free.h) {
      results.push({
        x: free.x,
        y: block.y + block.h,
        w: free.w,
        h: free.y + free.h - (block.y + block.h),
      });
    }

    return results.filter(function (rect) {
      return rect.w > 4 && rect.h > 4;
    });
  }

  function pruneFreeRects(freeRects, placedRects) {
    const pruned = [];

    freeRects.forEach(function (rect, i) {
      let contained = false;
      for (let j = 0; j < freeRects.length; j++) {
        if (i !== j && rectContains(freeRects[j], rect)) {
          contained = true;
          break;
        }
      }
      if (!contained && !collidesWithPlaced(rect, placedRects)) {
        pruned.push(rect);
      }
    });

    return pruned;
  }

  function comparePlacement(a, b) {
    if (a.score !== b.score) return a.score - b.score;
    if (a.y !== b.y) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;
    return b.width - a.width;
  }

  function measureCardHeight(card, width) {
    card.style.width = width + "px";
    return card.offsetHeight;
  }

  function findBestPlacement(entry, freeRects, placedRects, config) {
    let best = null;
    const card = entry.card;

    candidateWidths(entry.sizeKey, config).forEach(function (candidate) {
      const height = measureCardHeight(card, candidate.width);

      freeRects.forEach(function (free) {
        const candidateRect = {
          x: free.x,
          y: free.y,
          w: candidate.width,
          h: height,
        };

        if (!fitsInFree(candidateRect, free)) return;
        if (collidesWithPlaced(paddedRect(candidateRect, config.gapX, config.gapY), placedRects)) {
          return;
        }

        const leftoverW = free.w - candidate.width;
        const leftoverH = free.h - height;
        const score = Math.min(leftoverW, leftoverH);

        const placement = {
          x: free.x,
          y: free.y,
          w: candidate.width,
          h: height,
          width: candidate.width,
          score: score,
        };

        if (!best || comparePlacement(placement, best) < 0) {
          best = placement;
        }
      });
    });

    return best;
  }

  function fallbackPlacement(entry, placedRects, config) {
    const card = entry.card;
    const widths = candidateWidths(entry.sizeKey, config);
    const yStops = [0];

    placedRects.forEach(function (placed) {
      yStops.push(placed.y + placed.h);
    });

    yStops.sort(function (a, b) {
      return a - b;
    });

    for (let w = 0; w < widths.length; w++) {
      const width = widths[w].width;
      const height = measureCardHeight(card, width);

      for (let s = 0; s < yStops.length; s++) {
        const y = yStops[s];
        for (let x = 0; x + width <= config.containerWidth + 0.5; x += 4) {
          const candidateRect = { x: x, y: y, w: width, h: height };
          if (!collidesWithPlaced(paddedRect(candidateRect, config.gapX, config.gapY), placedRects)) {
            return {
              x: x,
              y: y,
              w: width,
              h: height,
              width: width,
              score: 0,
            };
          }
        }
      }
    }

    const width = widths[0].width;
    const height = measureCardHeight(card, width);
    let y = 0;
    placedRects.forEach(function (placed) {
      y = Math.max(y, placed.y + placed.h);
    });

    return {
      x: 0,
      y: y,
      w: width,
      h: height,
      width: width,
      score: 0,
    };
  }

  function sortEntries(entries, tier) {
    entries.sort(function (a, b) {
      if (tier === "phone") {
        if (b.effectivePriority !== a.effectivePriority) {
          return b.effectivePriority - a.effectivePriority;
        }
        return b.area - a.area;
      }

      if (tier === "tablet") {
        const bandA = Math.floor(a.effectivePriority / 8);
        const bandB = Math.floor(b.effectivePriority / 8);
        if (bandA !== bandB) return bandB - bandA;
        if (b.effectivePriority !== a.effectivePriority) {
          return b.effectivePriority - a.effectivePriority;
        }
        return b.area - a.area;
      }

      const bandA = Math.floor(a.priority / 5);
      const bandB = Math.floor(b.priority / 5);
      if (bandA !== bandB) return bandB - bandA;

      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;

      return b.area - a.area;
    });
  }

  function layoutGallery(cards) {
    const config = getLayoutConfig();
    syncLayoutCacheViewport(config);
    const entries = cards.map(function (card) {
      const painting = paintings[Number(card.dataset.index)];
      const img = card.querySelector("img");
      const sizeKey = paintingSize(painting);
      const range = config.sizeRanges[sizeKey];
      const refWidth = Math.round(((range.min + range.max) / 2) * config.containerWidth);
      const height = heightForWidth(img, refWidth);
      return {
        card: card,
        sizeKey: sizeKey,
        priority: paintingPriority(painting),
        effectivePriority: effectivePriority(painting, config.tier),
        area: refWidth * height,
      };
    });

    sortEntries(entries, config.tier);

    const canvasHeight = entries.reduce(function (sum, entry) {
      return sum + entry.area / config.containerWidth + config.gapY;
    }, 0) + config.gapY * 4;

    let freeRects = [{
      x: 0,
      y: 0,
      w: config.containerWidth,
      h: Math.max(canvasHeight, 800),
    }];
    const placedRects = [];
    let maxBottom = 0;

    entries.forEach(function (entry) {
      let placement = findBestPlacement(entry, freeRects, placedRects, config);
      if (!placement) {
        placement = fallbackPlacement(entry, placedRects, config);
      }

      const height = measureCardHeight(entry.card, placement.width);
      placement.h = height;

      entry.card.style.width = placement.width + "px";
      entry.card.dataset.layoutX = String(placement.x);
      entry.card.dataset.layoutY = String(placement.y);
      entry.card.dataset.layoutW = String(placement.width);
      entry.card.style.transform =
        "translate3d(" + placement.x + "px, " + placement.y + "px, 0)";

      const occupied = {
        x: placement.x,
        y: placement.y,
        w: placement.width,
        h: height,
      };

      placedRects.push(paddedRect(occupied, config.gapX, config.gapY));
      maxBottom = Math.max(maxBottom, placement.y + height);

      const nextRects = [];
      freeRects.forEach(function (free) {
        splitFreeRect(free, occupied, config.gapX, config.gapY)
          .forEach(function (rect) {
            nextRects.push(rect);
          });
      });
      freeRects = pruneFreeRects(nextRects, placedRects);
    });

    gallery.style.height = (maxBottom > 0 ? maxBottom + config.gapY : 0) + "px";
    saveLayoutCache(layoutSetKey(config, cards), cards);
  }

  function waitForImages(cards) {
    const images = cards.map(function (card) {
      return card.querySelector("img");
    });
    return Promise.all(
      images.map(function (img) {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(function (resolve) {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );
  }

  function waitForTransition(elements, propertyName) {
    const items = elements.length ? elements : [elements];
    return Promise.all(
      items.map(function (el) {
        return new Promise(function (resolve) {
          let settled = false;
          function done(event) {
            if (event && event.target !== el) return;
            if (propertyName && event && event.propertyName !== propertyName) return;
            if (settled) return;
            settled = true;
            el.removeEventListener("transitionend", done);
            resolve();
          }
          el.addEventListener("transitionend", done);
          window.setTimeout(done, FILTER_TRANSITION_MS + 100);
        });
      })
    );
  }

  function pinExitingCards(exiting, firstRects) {
    exiting.forEach(function (card) {
      const rect = firstRects.get(card.dataset.index);
      if (!rect) return;

      card.style.position = "fixed";
      card.style.left = rect.left + "px";
      card.style.top = rect.top + "px";
      card.style.width = rect.width + "px";
      card.style.height = rect.height + "px";
      card.style.margin = "0";
      card.style.transform = "none";
      card.style.opacity = "1";
      card.style.zIndex = "40";
    });

    requestAnimationFrame(function () {
      exiting.forEach(function (card) {
        card.classList.add("is-filter-exiting");
      });
      requestAnimationFrame(function () {
        exiting.forEach(function (card) {
          card.style.opacity = "0";
        });
      });
    });
  }

  function createPaintingCard(p, i) {
    const slug = slugify(p.title);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "painting-card painting-card--" + paintingSize(p);
    card.id = slug;
    card.dataset.index = String(i);
    card.setAttribute("aria-label", "View " + p.title);

    const img = document.createElement("img");
    img.src = p.image;
    img.alt = p.title;
    img.loading = "eager";

    const overlay = document.createElement("div");
    overlay.className = "painting-card-overlay";
    const h3 = document.createElement("h3");
    h3.textContent = p.title;
    overlay.appendChild(h3);

    const meta = overlayText(p);
    if (meta) {
      const para = document.createElement("p");
      para.textContent = meta;
      overlay.appendChild(para);
    }

    card.appendChild(img);
    card.appendChild(overlay);
    card.addEventListener("click", function () {
      openLightbox(i);
    });
    return card;
  }

  function captureCardRects(cards) {
    const rects = new Map();
    cards.forEach(function (card) {
      rects.set(card.dataset.index, card.getBoundingClientRect());
    });
    return rects;
  }

  function captureLayoutPositions(cards) {
    const positions = new Map();
    cards.forEach(function (card) {
      if (card.dataset.layoutX === undefined) return;
      positions.set(card.dataset.index, {
        x: parseFloat(card.dataset.layoutX) || 0,
        y: parseFloat(card.dataset.layoutY) || 0,
      });
    });
    return positions;
  }

  function applyGallerySlide(oldPositions, cards) {
    cards.forEach(function (card) {
      const newX = parseFloat(card.dataset.layoutX) || 0;
      const newY = parseFloat(card.dataset.layoutY) || 0;
      const old = oldPositions.get(card.dataset.index);
      const isEntering = card.classList.contains("is-filter-entering");

      card.style.transition = "none";

      if (old) {
        card.style.transform =
          "translate3d(" + old.x + "px, " + old.y + "px, 0)";
        card.style.opacity = "1";
      } else if (isEntering) {
        card.style.transform =
          "translate3d(" + newX + "px, " + (newY + 24) + "px, 0)";
        card.style.opacity = "0";
      }
    });

    gallery.classList.add("is-filter-layout-animating");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cards.forEach(function (card) {
          const newX = parseFloat(card.dataset.layoutX) || 0;
          const newY = parseFloat(card.dataset.layoutY) || 0;
          card.style.transition = "";
          card.classList.add("is-filter-animating");
          card.style.transform =
            "translate3d(" + newX + "px, " + newY + "px, 0)";
          card.style.opacity = "1";
        });

        waitForTransition(cards, "transform").then(function () {
          gallery.classList.remove("is-filter-layout-animating");
          cards.forEach(function (card) {
            const newX = parseFloat(card.dataset.layoutX) || 0;
            const newY = parseFloat(card.dataset.layoutY) || 0;
            card.classList.remove("is-filter-animating", "is-filter-entering");
            card.style.transition = "";
            card.style.opacity = "";
            card.style.willChange = "";
            card.style.transform =
              "translate3d(" + newX + "px, " + newY + "px, 0)";
          });
        });
      });
    });
  }

  function finishGalleryUpdate(toAdd, visible, stayingCards) {
    if (!visible.length) {
      gallery.classList.add("is-filter-layout-animating");
      gallery.style.height = "0";
      window.setTimeout(function () {
        gallery.classList.remove("is-filter-layout-animating");
      }, FILTER_TRANSITION_MS + 100);
      return;
    }

    const enteringCards = toAdd.map(function (p) {
      const card = createPaintingCard(p, paintingIndex(p));
      card.classList.add("is-filter-entering");
      card.style.visibility = "hidden";
      gallery.appendChild(card);
      return card;
    });

    const allCards = stayingCards.concat(enteringCards);
    const oldPositions = captureLayoutPositions(stayingCards);
    const config = getLayoutConfig();
    const cacheKey = layoutSetKey(config, allCards);
    const cacheAvailable = hasLayoutCache(cacheKey, allCards);

    function runLayoutAndSlide() {
      enteringCards.forEach(function (card) {
        card.style.visibility = "";
      });

      if (!applyLayoutFromCache(cacheKey, allCards, config)) {
        layoutGallery(allCards);
      }

      applyGallerySlide(oldPositions, allCards);
    }

    if (!cacheAvailable && enteringCards.length) {
      waitForImages(enteringCards).then(runLayoutAndSlide);
    } else {
      runLayoutAndSlide();
    }
  }

  function renderGalleryAnimated() {
    const visible = getVisiblePaintings();
    const visibleIndices = new Set(
      visible.map(function (p) {
        return String(paintingIndex(p));
      })
    );
    const existingCards = Array.from(gallery.querySelectorAll(".painting-card"));
    const exitRects = captureCardRects(existingCards);
    const stayingCards = existingCards.filter(function (card) {
      return visibleIndices.has(card.dataset.index);
    });
    const toAdd = visible.filter(function (p) {
      return !stayingCards.some(function (card) {
        return card.dataset.index === String(paintingIndex(p));
      });
    });
    const exiting = existingCards.filter(function (card) {
      return !visibleIndices.has(card.dataset.index);
    });

    galleryEmpty.hidden = !(activeFilters.size > 0 && visible.length === 0);

    if (!existingCards.length) {
      renderGallery(false);
      return;
    }

    if (exiting.length) {
      pinExitingCards(exiting, exitRects);
      waitForTransition(exiting, "opacity").then(function () {
        exiting.forEach(function (card) {
          card.remove();
        });
      });
    }

    finishGalleryUpdate(toAdd, visible, stayingCards);
  }

  function renderGallery(animate) {
    const visible = getVisiblePaintings();
    galleryEmpty.hidden = !(activeFilters.size > 0 && visible.length === 0);

    if (animate) {
      renderGalleryAnimated();
      return;
    }

    gallery.innerHTML = "";
    gallery.style.height = "0";

    if (!visible.length) return;

    const cards = visible.map(function (p) {
      const i = paintingIndex(p);
      const card = createPaintingCard(p, i);
      gallery.appendChild(card);
      return card;
    });

    waitForImages(cards).then(function () {
      layoutGallery(cards);
    });
  }

  function closeFilterMenu() {
    filterTrigger.setAttribute("aria-expanded", "false");
    filterMenu.hidden = true;
  }

  function openFilterMenu() {
    filterTrigger.setAttribute("aria-expanded", "true");
    filterMenu.hidden = false;
  }

  function toggleFilterMenu() {
    if (filterMenu.hidden) {
      openFilterMenu();
    } else {
      closeFilterMenu();
    }
  }

  function addFilter(category) {
    activeFilters.add(category);
    closeFilterMenu();
    renderFilterUI();
    renderGallery(true);
    if (lightbox.classList.contains("is-open") && !matchesFilters(paintings[currentIndex])) {
      closeLightbox();
    }
  }

  function removeFilter(category) {
    activeFilters.delete(category);
    renderFilterUI();
    renderGallery(true);
    if (lightbox.classList.contains("is-open") && !matchesFilters(paintings[currentIndex])) {
      closeLightbox();
    }
  }

  function renderFilterChips() {
    filterChips.innerHTML = "";
    Array.from(activeFilters).sort().forEach(function (category) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "painting-filter-chip";
      chip.setAttribute("aria-label", "Remove " + category + " filter");
      chip.addEventListener("click", function () {
        removeFilter(category);
      });

      const label = document.createElement("span");
      label.textContent = category;
      chip.appendChild(label);

      const removeIcon = document.createElement("span");
      removeIcon.className = "painting-filter-chip-remove";
      removeIcon.setAttribute("aria-hidden", "true");
      removeIcon.textContent = "\u00d7";
      chip.appendChild(removeIcon);

      filterChips.appendChild(chip);
    });
  }

  function renderFilterMenu() {
    const available = getUniqueCategories().filter(function (category) {
      return !activeFilters.has(category);
    });

    filterMenu.innerHTML = "";

    if (!available.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "painting-filter-menu-empty";
      emptyItem.textContent = "No more filters";
      filterMenu.appendChild(emptyItem);
      return;
    }

    available.forEach(function (category) {
      const item = document.createElement("li");
      const option = document.createElement("button");
      option.type = "button";
      option.className = "painting-filter-option";
      option.setAttribute("role", "option");
      option.textContent = category;
      option.addEventListener("click", function () {
        addFilter(category);
      });
      item.appendChild(option);
      filterMenu.appendChild(item);
    });
  }

  function renderFilterUI() {
    renderFilterMenu();
    renderFilterChips();
  }

  filterTrigger.addEventListener("click", function () {
    renderFilterMenu();
    toggleFilterMenu();
  });

  document.addEventListener("click", function (e) {
    if (!filterMenu.hidden && !e.target.closest(".painting-filter-dropdown")) {
      closeFilterMenu();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !filterMenu.hidden) {
      closeFilterMenu();
      filterTrigger.focus();
      return;
    }
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const cards = Array.from(gallery.querySelectorAll(".painting-card"));
      if (!cards.length) return;
      const config = getLayoutConfig();
      syncLayoutCacheViewport(config);
      layoutGallery(cards);
    }, 150);
  });

  function populateLightbox(index) {
    const p = paintings[index];
    currentIndex = index;

    lbImage.src = p.image;
    lbImage.alt = p.title;
    lbTitle.textContent = p.title;

    const meta = metaParts(p);
    if (meta.length) {
      lbMeta.textContent = meta.join(" · ");
      lbMeta.hidden = false;
    } else {
      lbMeta.hidden = true;
    }

    if (p.description) {
      lbDescription.textContent = p.description;
      lbDescription.hidden = false;
    } else {
      lbDescription.hidden = true;
    }

    if (p.notes) {
      lbNotes.textContent = p.notes;
      lbNotes.hidden = false;
    } else {
      lbNotes.hidden = true;
    }

    lbCounter.textContent =
      getVisiblePaintings().findIndex(function (p) {
        return p.title === paintings[index].title;
      }) + 1 +
      " / " +
      getVisiblePaintings().length;
  }

  function openLightbox(index) {
    populateLightbox(index);
    lightbox.classList.add("is-open");
    document.body.classList.add("lightbox-open");
    const slug = slugify(paintings[index].title);
    history.replaceState(null, "", "#" + slug);
    btnClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("lightbox-open");
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  function step(delta) {
    const visible = getVisiblePaintings();
    if (!visible.length) return;

    const pos = visible.findIndex(function (p) {
      return p.title === paintings[currentIndex].title;
    });
    const start = pos >= 0 ? pos : 0;
    const nextPos = (start + delta + visible.length) % visible.length;
    const nextIndex = paintingIndex(visible[nextPos]);
    populateLightbox(nextIndex);
    const slug = slugify(paintings[nextIndex].title);
    history.replaceState(null, "", "#" + slug);
  }

  function openFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const idx = paintings.findIndex(function (p) {
      return slugify(p.title) === hash;
    });
    if (idx >= 0 && matchesFilters(paintings[idx])) openLightbox(idx);
  }

  btnClose.addEventListener("click", closeLightbox);
  btnPrev.addEventListener("click", function () {
    step(-1);
  });
  btnNext.addEventListener("click", function () {
    step(1);
  });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  window.addEventListener("hashchange", openFromHash);

  renderFilterUI();
  renderGallery(false);
  openFromHash();
})();
