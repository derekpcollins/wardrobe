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
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
};


// ── State ─────────────────────────────────────────────────

let items = [];

let filters = {
  season: '',           // single string — set to current season on init
  status: 'owned',     // 'all' | 'owned' | 'want-to-try'
  replacement: 'all',  // 'all' | 'replace-soon' | 'overdue'
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
  if (season) h1.classList.add(`season--${season}`);
}

// ── Render: filter dot ────────────────────────────────────

function isFilterActive() {
  return filters.status !== 'owned' ||
         filters.replacement !== 'all' ||
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

  const linkIcon = item.url
    ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer" class="item-link" title="View item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>`
    : '';

  const metaParts = [
    item.brand,
    item.size ? `Size ${item.size}` : null,
    item.price != null ? `$${item.price}` : null,
  ].filter(Boolean);

  const seasons = (item.seasons || [])
    .map(s => `<span class="season-chip">${SEASON_LABELS[s] || s}</span>`)
    .join('');

  const badges = [];
  if (isWant) badges.push('<span class="badge badge-want">Want to Try</span>');
  if (repStatus === 'overdue') badges.push('<span class="badge badge-overdue">Overdue</span>');
  if (repStatus === 'replace-soon') badges.push('<span class="badge badge-replace-soon">Replace Soon</span>');

  const qtyStatus = getQtyStatus(item);
  if (qtyStatus === 'empty') {
    badges.push(`<span class="badge badge-overdue">${item.quantity} / ${item.idealQuantity}</span>`);
  } else if (qtyStatus === 'low') {
    badges.push(`<span class="badge badge-replace-soon">${item.quantity} / ${item.idealQuantity}</span>`);
  } else if (qtyStatus === 'ok') {
    badges.push(`<span class="item-qty">${item.quantity} / ${item.idealQuantity}</span>`);
  }

  return `
    <div class="item-card ${isWant ? 'item-card--want' : ''}">
      <div class="item-card-main">
        <div class="item-info">
          <div class="item-top-row">
            <span class="item-name">${esc(item.name)}</span>
            ${linkIcon}
          </div>
          ${metaParts.length ? `<div class="item-meta">${esc(metaParts.join(' · '))}</div>` : ''}
          ${seasons ? `<div class="item-seasons">${seasons}</div>` : ''}
          ${badges.length ? `<div class="item-badges">${badges.join('')}</div>` : ''}
          ${item.notes ? `<div class="item-notes">${esc(item.notes)}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}


// ── Event wiring ──────────────────────────────────────────

// Season select
document.getElementById('season-select').addEventListener('change', e => {
  filters.season = e.target.value;
  renderSeasonH1();
  renderList();
});

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

// Drawer — reset
document.getElementById('drawer-reset-btn').addEventListener('click', () => {
  filters.status = 'owned';
  filters.replacement = 'all';
  filters.categories = [];
  filters.brand = '';
  renderDrawer();
  renderList();
  updateFilterDot();
});


// ── Init ──────────────────────────────────────────────────

async function init() {
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
