(function () {
  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("painting-lightbox");
  if (!gallery || !lightbox || typeof PAINTINGS === "undefined") return;

  const paintings = PAINTINGS.filter(function (p) {
    return p.scale !== 0;
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
    return [p.size, p.cost].filter(Boolean);
  }

  function overlayText(p) {
    const parts = metaParts(p);
    return parts.length ? parts.join(" · ") : "";
  }

  function paintingScale(p) {
    const scale = Number(p.scale);
    if (!Number.isFinite(scale) || scale <= 0) return 10;
    return scale;
  }

  function renderGallery() {
    gallery.innerHTML = "";
    paintings.forEach(function (p, i) {
      const slug = slugify(p.title);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "painting-card";
      card.id = slug;
      card.dataset.index = String(i);
      card.style.setProperty("--scale", String(paintingScale(p)));
      card.setAttribute("aria-label", "View " + p.title);

      const img = document.createElement("img");
      img.src = p.image;
      img.alt = p.title;
      img.loading = "lazy";

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
    });
  }

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
