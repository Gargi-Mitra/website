/*
  The behaviour of every page on the site (every page loads this file).
  Nothing here needs editing. Each part quietly does nothing on a page that lacks its section.
*/

/*
  Light / dark switch. Nothing to edit here. It flips the page between the
  two colour sets and remembers the visitor's choice for their next visit.
*/
(function () {
  var root = document.documentElement;
  var button = document.querySelector('.theme-switch');
  if (!button) return;

  function isDark() { return root.getAttribute('data-theme') === 'dark'; }
  function set(dark) {
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    button.setAttribute('aria-checked', String(dark));
  }

  set(isDark());
  button.hidden = false;

  button.addEventListener('click', function () {
    var dark = !isDark();
    set(dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  });

  // Until the visitor has used the switch, keep following their device setting.
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  if (media.addEventListener) {
    media.addEventListener('change', function (event) {
      var saved = null;
      try { saved = localStorage.getItem('theme'); } catch (e) {}
      if (saved !== 'dark' && saved !== 'light') set(event.matches);
    });
  }
})();

/*
  Paper abstracts. Nothing to edit here: clicking a paper's title shows or
  hides the abstract written in that paper's <div class="abstract">. The DOI
  link under each paper still opens the paper itself.
*/
(function () {
  var hint = document.querySelector('#papers .hint');
  if (hint) hint.hidden = false;   // shown only when clicking titles actually works

  document.querySelectorAll('#papers .entry h3 a').forEach(function (link, i) {
    var entry = link.closest('.entry');
    var panel = entry && entry.querySelector('.abstract');
    if (!panel) return;
    panel.id = panel.id || 'abstract-' + (i + 1);
    link.setAttribute('role', 'button');
    link.setAttribute('aria-expanded', 'false');
    link.setAttribute('aria-controls', panel.id);

    function toggle(event) {
      // Ctrl, Cmd, Shift or middle click still opens the paper link as usual
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
      event.preventDefault();
      var open = panel.hidden;
      panel.hidden = !open;
      link.setAttribute('aria-expanded', String(open));
    }
    link.addEventListener('click', toggle);
    link.addEventListener('keydown', function (event) { if (event.key === ' ') toggle(event); });
  });
})();

/*
  Paper filter. Nothing to edit here: it reads the tags written on each paper,
  builds one button per tag above the list, and shows only matching papers
  when one or more tags are chosen. Without it the page still works, just unfiltered.
*/
(function () {
  var section = document.getElementById('papers');
  var list = section && section.querySelector('.timeline');
  if (!list) return;

  var papers = [];      // one record per paper: its element and its tag keys
  var names = {};       // tag key -> the spelling to show
  var order = [];       // tag keys in order of first appearance

  list.querySelectorAll('.entry').forEach(function (el) {
    var keys = [];
    el.querySelectorAll('.tags').forEach(function (tagList) {
      tagList.querySelectorAll('li').forEach(function (li) {
        var name = li.textContent.replace(/\s+/g, ' ').trim();
        if (!name) { li.remove(); return; }
        var key = name.toLowerCase();
        if (!names[key]) { names[key] = name; order.push(key); }
        if (keys.indexOf(key) === -1) keys.push(key);
        li.textContent = '';
        li.appendChild(makeButton(names[key], key));
      });
      tagList.classList.add('is-live');
    });
    var when = el.querySelector('.when');
    var year = when ? parseInt((when.textContent.match(/\d{4}/) || [0])[0], 10) : 0;
    papers.push({ el: el, keys: keys, year: year, index: papers.length });
  });

  if (!order.length) return;

  var bar = document.createElement('div');
  bar.className = 'filter';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Filter papers by area');
  bar.appendChild(makeButton('All', ''));
  order.forEach(function (key) { bar.appendChild(makeButton(names[key], key)); });

  var status = document.createElement('p');
  status.className = 'filter-status';
  status.setAttribute('aria-live', 'polite');
  bar.appendChild(status);

  list.parentNode.insertBefore(bar, list);

  var active = [];      // the tags chosen right now; empty means "All"
  show([]);

  section.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-tag]');
    if (!button) return;
    var key = button.getAttribute('data-tag');
    if (!key) { show([]); return; }                      // "All" clears every tag
    var next = active.filter(function (k) { return k !== key; });
    if (next.length === active.length) next.push(key);   // not chosen yet: add it. Already chosen: it was just removed
    show(next);
  });

  function makeButton(label, key) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag';
    button.textContent = label;
    button.setAttribute('data-tag', key);
    return button;
  }

  function show(keys) {
    active = keys;
    var shown = 0;
    papers.forEach(function (paper) {
      // a paper shows if it carries ANY of the chosen tags
      paper.score = paper.keys.filter(function (k) { return keys.indexOf(k) !== -1; }).length;
      var match = !keys.length || paper.score > 0;
      paper.el.hidden = !match;
      if (match) shown += 1;
    });
    // Order: papers matching the most chosen tags first, then the most recent
    // year, then the order written in this file. "All" restores the file's order.
    var focused = document.activeElement;
    papers.slice().sort(function (a, b) {
      if (!keys.length) return a.index - b.index;
      return (b.score - a.score) || (b.year - a.year) || (a.index - b.index);
    }).forEach(function (paper) { list.appendChild(paper.el); });
    if (focused && focused !== document.activeElement && focused.focus) focused.focus();
    section.querySelectorAll('button[data-tag]').forEach(function (button) {
      var tag = button.getAttribute('data-tag');
      button.setAttribute('aria-pressed', String(tag ? keys.indexOf(tag) !== -1 : !keys.length));
    });
    status.textContent = keys.length ? shown + ' of ' + papers.length + ' papers' : '';
  }
})();
