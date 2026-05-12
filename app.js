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

const CATEGORY_DEFAULTS = {
  basics: 180,
  tops: 730,
  bottoms: 1095,
  outerwear: 1825,
  footwear: 730,
  accessories: 1825,
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

let editingId = null;
let formIntervalDirty = false;

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

function generateId() {
  return 'item-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Data ──────────────────────────────────────────────────

async function loadData() {
  const res = await fetch('./wardrobe.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  items = await res.json();
}

function downloadJSON() {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wardrobe.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

  const pencilSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  const trashSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

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
        <div class="item-actions">
          <button class="icon-btn item-edit-btn" data-id="${item.id}" aria-label="Edit ${esc(item.name)}">
            ${pencilSvg}
          </button>
          <button class="icon-btn icon-btn--delete item-delete-btn" data-id="${item.id}" aria-label="Delete ${esc(item.name)}">
            ${trashSvg}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Modal ─────────────────────────────────────────────────

function openModal(id) {
  editingId = id || null;
  formIntervalDirty = false;
  const item = id ? items.find(i => i.id === id) : null;
  document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'Add Item';
  buildForm(item);
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById('modal').scrollTop = 0;
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  editingId = null;
}

function buildForm(item) {
  const isOwned = !item || item.status === 'owned';
  const selectedSeasons = item ? (item.seasons || []) : [];
  const category = item ? item.category : 'basics';
  const intervalDefault = CATEGORY_DEFAULTS[category] || 365;

  document.getElementById('modal-body').innerHTML = `
    <div class="form-status-toggle">
      <button type="button" class="form-status-btn ${isOwned ? 'active' : ''}" data-status="owned">Owned</button>
      <button type="button" class="form-status-btn ${!isOwned ? 'active' : ''}" data-status="want-to-try">Want to Try</button>
    </div>

    <div class="form-group">
      <label class="form-label" for="f-name">Name *</label>
      <input id="f-name" class="form-input" type="text" value="${esc(item?.name || '')}" placeholder="e.g. White Crew T-Shirt" autocomplete="off">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="f-brand">Brand *</label>
        <input id="f-brand" class="form-input" type="text" value="${esc(item?.brand || '')}" placeholder="e.g. Nike" autocomplete="off">
      </div>
      <div class="form-group">
        <label class="form-label" for="f-category">Category *</label>
        <select id="f-category" class="form-select">
          ${CATEGORIES.map(c => `<option value="${c}" ${category === c ? 'selected' : ''}>${CATEGORY_LABELS[c]}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="f-price">Price ($)</label>
        <input id="f-price" class="form-input" type="number" min="0" step="0.01" value="${item?.price ?? ''}" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label" for="f-size">Size</label>
        <input id="f-size" class="form-input" type="text" value="${esc(item?.size || '')}" placeholder="e.g. M, 32x30">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="f-url">URL</label>
      <input id="f-url" class="form-input" type="url" value="${esc(item?.url || '')}" placeholder="https://…">
    </div>

    <div class="form-group">
      <label class="form-label">Seasons *</label>
      <div class="form-seasons">
        ${SEASONS.map(s => `
          <button type="button" class="form-season-pill ${selectedSeasons.includes(s) ? 'active' : ''}" data-season="${s}">
            ${SEASON_LABELS[s]}
          </button>
        `).join('')}
      </div>
    </div>

    <div id="owned-fields" style="${isOwned ? '' : 'display:none'}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="f-date">Date Purchased</label>
          <input id="f-date" class="form-input" type="date" value="${esc(item?.datePurchased || '')}">
        </div>
        <div class="form-group">
          <label class="form-label" for="f-interval">Replace every (days)</label>
          <input id="f-interval" class="form-input" type="number" min="1"
            value="${item?.replacementIntervalDays ?? intervalDefault}"
            placeholder="${intervalDefault}">
        </div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="f-notes">Notes</label>
      <textarea id="f-notes" class="form-textarea" placeholder="Any notes…">${esc(item?.notes || '')}</textarea>
    </div>

    ${item ? `<button type="button" class="btn-delete" id="form-delete-btn">Delete Item</button>` : ''}
    <div style="height:8px"></div>
  `;

  // Status toggle
  document.querySelectorAll('.form-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.form-status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('owned-fields').style.display =
        btn.dataset.status === 'owned' ? '' : 'none';
    });
  });

  // Season pills
  document.querySelectorAll('.form-season-pill').forEach(pill => {
    pill.addEventListener('click', () => pill.classList.toggle('active'));
  });

  // Category → auto-fill interval default (unless user touched it)
  const intervalEl = document.getElementById('f-interval');
  if (intervalEl) {
    intervalEl.addEventListener('input', () => { formIntervalDirty = true; });
    document.getElementById('f-category').addEventListener('change', e => {
      if (!formIntervalDirty) {
        intervalEl.value = CATEGORY_DEFAULTS[e.target.value] || '';
      }
    });
  }

  const deleteBtn = document.getElementById('form-delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
}

function collectFormData() {
  const statusBtn = document.querySelector('.form-status-btn.active');
  const status = statusBtn ? statusBtn.dataset.status : 'owned';
  const isOwned = status === 'owned';

  const name     = document.getElementById('f-name').value.trim();
  const brand    = document.getElementById('f-brand').value.trim();
  const category = document.getElementById('f-category').value;
  const priceRaw = document.getElementById('f-price').value;
  const size     = document.getElementById('f-size').value.trim();
  const url      = document.getElementById('f-url').value.trim();
  const notes    = document.getElementById('f-notes').value.trim();
  const seasons  = [...document.querySelectorAll('.form-season-pill.active')].map(p => p.dataset.season);

  const obj = { status, category, name, brand, seasons };
  if (url)  obj.url   = url;
  if (size) obj.size  = size;
  if (priceRaw !== '') obj.price = parseFloat(priceRaw);
  if (notes) obj.notes = notes;

  if (isOwned) {
    const date     = document.getElementById('f-date').value;
    const interval = document.getElementById('f-interval').value;
    if (date)     obj.datePurchased          = date;
    if (interval) obj.replacementIntervalDays = parseInt(interval, 10);
  }

  return obj;
}

function handleSave() {
  const data = collectFormData();

  if (!data.name)           { alert('Name is required.');           return; }
  if (!data.brand)          { alert('Brand is required.');          return; }
  if (!data.seasons.length) { alert('Select at least one season.'); return; }

  if (editingId) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx >= 0) items[idx] = { id: editingId, ...data };
  } else {
    items.push({ id: generateId(), ...data });
  }

  closeModal();
  renderList();
  downloadJSON();
}

function handleDelete() {
  const item = items.find(i => i.id === editingId);
  if (!item) return;
  if (!confirm(`Delete "${item.name}"?`)) return;
  items = items.filter(i => i.id !== editingId);
  closeModal();
  renderList();
  downloadJSON();
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

// Item list — edit + delete (delegated)
document.getElementById('item-list').addEventListener('click', e => {
  const editBtn   = e.target.closest('.item-edit-btn');
  const deleteBtn = e.target.closest('.item-delete-btn');

  if (editBtn) {
    openModal(editBtn.dataset.id);
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const item = items.find(i => i.id === id);
    if (!item || !confirm(`Delete "${item.name}"?`)) return;
    items = items.filter(i => i.id !== id);
    renderList();
    downloadJSON();
  }
});

// FAB
document.getElementById('fab').addEventListener('click', () => openModal(null));

// Modal
document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
document.getElementById('modal-save-btn').addEventListener('click', handleSave);
document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
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
