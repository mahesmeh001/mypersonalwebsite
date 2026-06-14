(function () {
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("painting-lightbox");
  if (!gallery || !lightbox || typeof PAINTINGS === "undefined") return;

  const VALID_SIZES = ["small", "medium", "large"];

  // Desktop: fluid masonry fractions (~Rpatelart / Mike Svob).
  const SIZE_RANGES_DESKTOP = {
    small:  { min: 0.25, max: 0.25, steps: 1 },
    medium: { min: 0.28, max: 0.31, steps: 2 },
    large:  { min: 0.32, max: 0.36, steps: 2 },
  };

  const paintings = PAINTINGS.filter(function (p) {
    return !p.draft;
  });
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
      entry.card.style.transform =
        "translate(" + placement.x + "px, " + placement.y + "px)";

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

  function renderGallery() {
    gallery.innerHTML = "";
    gallery.style.height = "0";

    const cards = paintings.map(function (p, i) {
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
      gallery.appendChild(card);
      return card;
    });

    waitForImages(cards).then(function () {
      layoutGallery(cards);
    });
  }

  let resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const cards = Array.from(gallery.querySelectorAll(".painting-card"));
      if (cards.length) layoutGallery(cards);
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

    lbCounter.textContent = index + 1 + " / " + paintings.length;
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
    const next = (currentIndex + delta + paintings.length) % paintings.length;
    populateLightbox(next);
    const slug = slugify(paintings[next].title);
    history.replaceState(null, "", "#" + slug);
  }

  function openFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const idx = paintings.findIndex(function (p) {
      return slugify(p.title) === hash;
    });
    if (idx >= 0) openLightbox(idx);
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

  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  window.addEventListener("hashchange", openFromHash);

  renderGallery();
  openFromHash();
})();
