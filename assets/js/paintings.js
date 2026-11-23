// Renders PAINTINGS (defined in paintings.html) as a grid with a click-to-enlarge lightbox.
(function () {
  var shown = PAINTINGS.filter(function (p) { return !p.draft; });
  var grid = document.getElementById('gallery');
  var box = document.getElementById('lightbox');
  var big = box.querySelector('img');
  var caption = box.querySelector('p');
  var current = 0;

  var figs = shown.map(function (p, i) {
    var fig = document.createElement('figure');
    fig.innerHTML = '<img loading="lazy" alt=""><figcaption></figcaption>';
    fig.querySelector('img').src = p.image;
    fig.querySelector('img').alt = p.title;
    fig.querySelector('figcaption').textContent = p.title;
    fig.addEventListener('click', function () { open(i); });
    return fig;
  });

  // Deal paintings into columns round-robin, so the first row holds the first N paintings.
  var cols = 0;
  function layout() {
    var n = grid.clientWidth >= 900 ? 3 : grid.clientWidth >= 560 ? 2 : 1;
    if (n === cols) return;
    cols = n;
    grid.innerHTML = '';
    var colEls = [];
    for (var c = 0; c < n; c++) {
      colEls.push(grid.appendChild(document.createElement('div')));
      colEls[c].className = 'painting-col';
    }
    figs.forEach(function (fig, i) { colEls[i % n].appendChild(fig); });
  }
  layout();
  window.addEventListener('resize', layout);

  function open(i) {
    current = (i + shown.length) % shown.length;
    big.src = shown[current].image;
    big.alt = shown[current].title;
    caption.textContent = shown[current].title;
    box.classList.add('open');
  }

  function close() { box.classList.remove('open'); }

  box.addEventListener('click', close);
  box.querySelector('.prev').addEventListener('click', function (e) { e.stopPropagation(); open(current - 1); });
  box.querySelector('.next').addEventListener('click', function (e) { e.stopPropagation(); open(current + 1); });
  document.addEventListener('keydown', function (e) {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') open(current - 1);
    if (e.key === 'ArrowRight') open(current + 1);
  });
})();
