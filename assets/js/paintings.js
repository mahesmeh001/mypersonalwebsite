// Renders PAINTINGS (defined in paintings.html) as a grid with a medium filter
// and a click-to-enlarge lightbox.
(function () {
  var all = PAINTINGS.filter(function (p) { return !p.draft; });
  var grid = document.getElementById('gallery');
  var box = document.getElementById('lightbox');
  var big = box.querySelector('img');
  var caption = box.querySelector('p');

  var visible = all;   // paintings matching the current filter
  var current = 0;     // index into visible, for the lightbox

  all.forEach(function (p) {
    var fig = document.createElement('figure');
    fig.innerHTML = '<img loading="lazy" alt=""><figcaption></figcaption>';
    fig.querySelector('img').src = p.image;
    fig.querySelector('img').alt = p.title;
    fig.querySelector('figcaption').textContent = p.title;
    fig.addEventListener('click', function () { open(visible.indexOf(p)); });
    p.fig = fig;
  });

  // Medium filter pills: "All" plus one per medium, one active at a time.
  var pills = document.getElementById('filter-pills');
  var order = ['watercolor', 'acrylic', 'oil'];
  var mediums = [];
  all.forEach(function (p) {
    (p.category || []).forEach(function (m) { if (mediums.indexOf(m) < 0) mediums.push(m); });
  });
  mediums.sort(function (x, y) { return (order.indexOf(x) + 1 || 99) - (order.indexOf(y) + 1 || 99); });

  ['all'].concat(mediums).forEach(function (m) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1);
    b.setAttribute('aria-pressed', m === 'all');
    b.addEventListener('click', function () {
      pills.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      visible = m === 'all' ? all : all.filter(function (p) { return (p.category || []).indexOf(m) >= 0; });
      cols = 0;
      layout();
    });
    pills.appendChild(b);
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
    visible.forEach(function (p, i) { colEls[i % n].appendChild(p.fig); });
  }
  layout();
  window.addEventListener('resize', layout);

  function open(i) {
    current = (i + visible.length) % visible.length;
    big.src = visible[current].image;
    big.alt = visible[current].title;
    caption.textContent = visible[current].title;
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
