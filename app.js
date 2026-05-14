'use strict';

// ── Constants ─────────────────────────────────────────────

const CATEGORIES = ['basics', 'tops', 'bottoms', 'outerwear', 'footwear', 'accessories'];

const CATEGORY_LABELS = {
  basics: 'Basics',
  tops: 'Tops',
  bottoms: 'Bottoms',
  outerwear: 'Outerwear',
  footwear: 'Footwear',
  accessories: 'Accessories',
};

const SEASONS = ['spring', 'summer', 'fall', 'winter'];

const SEASON_LABELS = {
  '':      'All Seasons',
  spring:  'Spring',
  summer:  'Summer',
  fall:    'Fall',
  winter:  'Winter',
};

const ICON_RULES = [
  [/hoodie|hoody|jacket/i,     'fa-user-hoodie'],
  [/1\/4\s*zip|quarter.?zip/i, 'fa-shirt-long-sleeve'],
  [/tee|t-shirt|crew.?neck/i,  'fa-shirt'],
  [/shorts/i,                  'fa-shorts'],
  [/tight|jogger/i,            'fa-pants'],
  [/jean/i,                    'fa-jeans'],
  [/sock/i,                    'fa-socks'],
  [/trunk|brief|boxer/i,       'fa-briefs'],
  [/sneaker|trainer/i,         'fa-sneaker'],
  [/tactical|boot|hiking/i,    'fa-boot'],
  [/shoe/i,                    'fa-sneaker'],
];


// ── State ─────────────────────────────────────────────────

let items = [];

let filters = {
  season: '',           // single string — set to current season on init
  status: 'owned',     // 'all' | 'owned' | 'want-to-try'
  replacement: 'all',  // 'all' | 'replace-soon' | 'overdue'
  retiring: false,
  categories: [],
  brand: '',
};


// ── Utilities ─────────────────────────────────────────────

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'fall';
  return 'winter';
}

function getReplacementStatus(item) {
  if (item.status === 'want-to-try') return null;
  if (!item.datePurchased || !item.replacementIntervalDays) return null;
  const due = new Date(item.datePurchased);
  due.setDate(due.getDate() + item.replacementIntervalDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((due - today) / 86400000);
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 30) return 'replace-soon';
  return 'ok';
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function getItemIcon(name) {
  for (const [re, icon] of ICON_RULES) {
    if (re.test(name)) return icon;
  }
  return 'fa-clothes-hanger';
}

function getQtyStatus(item) {
  if (item.status === 'want-to-try') return null;
  if (item.quantity == null || item.idealQuantity == null) return null;
  if (item.quantity === 0) return 'empty';
  if (item.quantity < item.idealQuantity) return 'low';
  return 'ok';
}

// ── Data ──────────────────────────────────────────────────

async function loadData() {
  const res = await fetch('./wardrobe.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  items = await res.json();
}


// ── Filtering ─────────────────────────────────────────────

function getFilteredItems() {
  return items.filter(item => {
    if (filters.season && !item.seasons.includes(filters.season)) return false;
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    if (filters.replacement !== 'all' && getReplacementStatus(item) !== filters.replacement) return false;
    if (filters.retiring && !item.retiring) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(item.category)) return false;
    if (filters.brand && item.brand !== filters.brand) return false;
    return true;
  });
}

// ── Render: season H1 ─────────────────────────────────────

function renderSeasonH1() {
  const season = filters.season;
  document.getElementById('season-name').textContent = SEASON_LABELS[season] || season;
  document.getElementById('season-select').value = season;

  const h1 = document.getElementById('season-h1');
  SEASONS.forEach(s => h1.classList.remove(`season--${s}`));
  h1.classList.remove('season--all');
  h1.classList.add(season ? `season--${season}` : 'season--all');
}

// ── Render: filter dot ────────────────────────────────────

function isFilterActive() {
  return filters.status !== 'owned' ||
         filters.replacement !== 'all' ||
         filters.retiring ||
         filters.categories.length > 0 ||
         filters.brand !== '';
}

function updateFilterDot() {
  document.getElementById('filter-dot').style.display = isFilterActive() ? 'block' : 'none';
}

// ── Render: drawer ────────────────────────────────────────

function renderDrawer() {
  // Status
  document.getElementById('drawer-status').innerHTML = [
    { value: 'all',         label: 'All' },
    { value: 'owned',       label: 'Owned' },
    { value: 'want-to-try', label: 'Want to Try' },
  ].map(o => `
    <button class="toggle-btn ${filters.status === o.value ? 'active' : ''}" data-status="${o.value}">
      ${o.label}
    </button>
  `).join('');

  // Replacement
  document.getElementById('drawer-replacement').innerHTML = [
    { value: 'all',          label: 'All' },
    { value: 'replace-soon', label: 'Soon' },
    { value: 'overdue',      label: 'Overdue' },
  ].map(o => `
    <button class="toggle-btn ${filters.replacement === o.value ? 'active' : ''}" data-replacement="${o.value}">
      ${o.label}
    </button>
  `).join('');

  // Retire
  document.getElementById('drawer-retiring').innerHTML = `
    <button class="toggle-btn ${filters.retiring ? 'active' : ''}" data-retiring="true">
      Retire
    </button>
  `;

  // Categories
  document.getElementById('drawer-categories').innerHTML = CATEGORIES.map(c => `
    <button class="pill ${filters.categories.includes(c) ? 'active' : ''}" data-category="${c}">
      ${CATEGORY_LABELS[c]}
    </button>
  `).join('');

  // Brand
  const brands = [...new Set(items.map(i => i.brand).filter(Boolean))].sort();
  document.getElementById('drawer-brand').innerHTML =
    '<option value="">All Brands</option>' +
    brands.map(b => `<option value="${esc(b)}" ${filters.brand === b ? 'selected' : ''}>${esc(b)}</option>`).join('');
}

// ── Drawer open / close ───────────────────────────────────

function openDrawer() {
  renderDrawer();
  document.getElementById('filter-drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.remove('hidden');
}

function closeDrawer() {
  document.getElementById('filter-drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.add('hidden');
}

// ── Render: item list ─────────────────────────────────────

function renderList() {
  const filtered = getFilteredItems();
  const el = document.getElementById('item-list');

  if (filtered.length === 0) {
    el.innerHTML = '<div class="empty-state">No items match your filters.</div>';
    return;
  }

  const grouped = {};
  CATEGORIES.forEach(c => { grouped[c] = []; });
  filtered.forEach(item => {
    if (grouped[item.category]) grouped[item.category].push(item);
  });
  CATEGORIES.forEach(c => grouped[c].sort((a, b) => a.name.localeCompare(b.name)));

  el.innerHTML = CATEGORIES
    .filter(c => grouped[c].length > 0)
    .map(c => `
      <div class="category-group">
        <h2 class="category-header">${CATEGORY_LABELS[c]}</h2>
        ${grouped[c].map(renderItemCard).join('')}
      </div>
    `).join('');
}

function renderItemCard(item) {
  const repStatus = getReplacementStatus(item);
  const isWant = item.status === 'want-to-try';

  const qtyStatus = getQtyStatus(item);

  const itemNameEl = item.url
    ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="item-name">${esc(item.name)}</a>`
    : `<span class="item-name">${esc(item.name)}</span>`;

  const qtyPart = (!isWant && item.quantity != null && item.idealQuantity != null)
    ? (qtyStatus === 'low'
        ? `<span class="meta-qty-low">${item.quantity} / ${item.idealQuantity}</span>`
        : `${item.quantity} / ${item.idealQuantity}`)
    : null;

  const metaHtmlParts = [
    item.brand ? esc(item.brand) : null,
    item.size ? esc(item.size) : null,
    item.color ? esc(item.color) : null,
    item.price != null ? `$${item.price.toFixed(2)}` : null,
    qtyPart,
  ].filter(Boolean);

  // Single highest-priority condition badge
  let conditionBadge = null;
  if (item.retiring) {
    conditionBadge = '<span class="badge badge-retiring">Retire</span>';
  } else if (repStatus === 'overdue') {
    conditionBadge = '<span class="badge badge-overdue">Overdue</span>';
  } else if (repStatus === 'replace-soon') {
    conditionBadge = '<span class="badge badge-replace-soon">Replace Soon</span>';
  } else if (qtyStatus === 'low') {
    conditionBadge = '<span class="badge badge-running-low">Low</span>';
  }

  // Status badge (Want to Try only — not subject to priority)
  const rowBadges = [];
  if (isWant) rowBadges.push('<span class="badge badge-want">Want to Try</span>');

  const faIcon = getItemIcon(item.name);

  return `
    <div class="item-card ${isWant ? 'item-card--want' : ''}">
      <div class="item-card-main">
        <div class="item-icon" aria-hidden="true">
          <i class="fa-sharp fa-light ${faIcon}"></i>
          ${item.colorHex ? `<span class="item-color-swatch" style="background:${esc(item.colorHex)}"></span>` : ''}
        </div>
        <div class="item-info">
          <div class="item-top-row">
            <div class="item-name-group">
              ${itemNameEl}
            </div>
            ${conditionBadge ? `<div class="item-top-right">${conditionBadge}</div>` : ''}
          </div>
          ${metaHtmlParts.length ? `<div class="item-meta">${metaHtmlParts.join(' · ')}</div>` : ''}
          ${item.notes ? `<div class="item-notes">${esc(item.notes)}</div>` : ''}
          ${rowBadges.length ? `<div class="item-badges">${rowBadges.join('')}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}


// ── Dark mode ─────────────────────────────────────────────

function isDarkActive() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle-btn');
  const dark = isDarkActive();
  btn.innerHTML = dark ? '<i class="fa-light fa-sun"></i>' : '<i class="fa-light fa-moon"></i>';
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const newDark = !isDarkActive();
  document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light');
  localStorage.setItem('theme', newDark ? 'dark' : 'light');
  updateThemeIcon();
}

function initTheme() {
  updateThemeIcon();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem('theme')) updateThemeIcon();
  });
}

// ── Event wiring ──────────────────────────────────────────

// Season select
document.getElementById('season-select').addEventListener('change', e => {
  filters.season = e.target.value;
  renderSeasonH1();
  renderList();
});

// Theme toggle
document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

// Filter icon → open drawer
document.getElementById('filter-btn').addEventListener('click', openDrawer);

// Drawer close
document.getElementById('drawer-close-btn').addEventListener('click', closeDrawer);
document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
document.getElementById('drawer-apply-btn').addEventListener('click', closeDrawer);

// Drawer — status toggle (live)
document.getElementById('drawer-status').addEventListener('click', e => {
  const btn = e.target.closest('.toggle-btn[data-status]');
  if (!btn) return;
  filters.status = btn.dataset.status;
  document.querySelectorAll('#drawer-status .toggle-btn').forEach(b =>
    b.classList.toggle('active', b === btn)
  );
  renderList();
  updateFilterDot();
});

// Drawer — replacement toggle (live)
document.getElementById('drawer-replacement').addEventListener('click', e => {
  const btn = e.target.closest('.toggle-btn[data-replacement]');
  if (!btn) return;
  filters.replacement = btn.dataset.replacement;
  document.querySelectorAll('#drawer-replacement .toggle-btn').forEach(b =>
    b.classList.toggle('active', b === btn)
  );
  renderList();
  updateFilterDot();
});

// Drawer — category chips (live)
document.getElementById('drawer-categories').addEventListener('click', e => {
  const btn = e.target.closest('.pill[data-category]');
  if (!btn) return;
  const c = btn.dataset.category;
  if (filters.categories.includes(c)) {
    filters.categories = filters.categories.filter(x => x !== c);
    btn.classList.remove('active');
  } else {
    filters.categories.push(c);
    btn.classList.add('active');
  }
  renderList();
  updateFilterDot();
});

// Drawer — brand (live)
document.getElementById('drawer-brand').addEventListener('change', e => {
  filters.brand = e.target.value;
  renderList();
  updateFilterDot();
});

// Drawer — retiring toggle (live)
document.getElementById('drawer-retiring').addEventListener('click', e => {
  const btn = e.target.closest('.toggle-btn[data-retiring]');
  if (!btn) return;
  filters.retiring = !filters.retiring;
  btn.classList.toggle('active', filters.retiring);
  renderList();
  updateFilterDot();
});

// Drawer — reset
document.getElementById('drawer-reset-btn').addEventListener('click', () => {
  filters.status = 'owned';
  filters.replacement = 'all';
  filters.retiring = false;
  filters.categories = [];
  filters.brand = '';
  renderDrawer();
  renderList();
  updateFilterDot();
});


// ── Init ──────────────────────────────────────────────────

async function init() {
  initTheme();
  try {
    await loadData();
  } catch (err) {
    document.getElementById('item-list').innerHTML =
      '<div class="empty-state">Failed to load wardrobe data.</div>';
    return;
  }
  filters.season = getCurrentSeason();
  renderSeasonH1();
  updateFilterDot();
  renderList();
}

init();
