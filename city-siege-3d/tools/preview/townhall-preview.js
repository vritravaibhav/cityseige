import * as THREE from 'three';
import { SceneManager } from '../../src/rendering/SceneManager.js';
import { AssetFactory } from '../../src/rendering/AssetFactory.js';
import { RoadNetwork } from '../../src/builder/RoadNetwork.js';
import { BuildingManager } from '../../src/builder/BuildingManager.js';
import { restoreCity } from '../../src/builder/CityPersistence.js';
import {
  BUILDING_DEFS,
  MAX_TOWN_HALL_LEVEL,
  PERIMETER_WALL_TILES,
  TILE_METRES,
  countedLimitFor,
  limitFor,
  unlocksAt
} from '../../src/data/progression.js';
import { FILLS, generateCity } from './cityLayout.js';

/**
 * townhall-preview.js - the Town Hall preview page (townhall.html): what a full city looks like at
 * every Town Hall, drawn by the game's own renderer (SceneManager, AssetFactory, BuildingManager,
 * RoadNetwork), so buildings, mesh tiers, gates, the perimeter wall and the lighting are exactly
 * the game's. The city itself comes from cityLayout.js (built with the game's placement rules).
 *
 * Developer tooling: Vite dev serves it at /townhall.html; `vite build` builds index.html alone,
 * so none of it ships, and nothing in the game imports it.
 *
 * It must never touch the player's save, so:
 *   - it imports neither src/main.js (the game, its autosave and its online layer) nor Firebase
 *     nor the SoundManager;
 *   - the city lives in a BuildingManager with NO economy and no hooks (the ArenaCity pattern):
 *     no refund, collect or save path of it can reach a bank or storage, and it is flagged
 *     isForeignCity, which CityPersistence.saveCity refuses outright;
 *   - it writes no browser storage at all: the page's state lives in the URL
 *     (?th=7&fill=full&levels=max&view=city), so a view can be bookmarked or shared.
 */

const VIEWS = ['city', 'satellite', 'night'];
const LABELS = {
  fill: { full: 'Full (every limit)', typical: 'Typical (~60%)' },
  levels: { max: 'Max levels (= Town Hall)', one: 'Level 1' },
  view: { city: 'City view', satellite: 'Satellite view', night: 'Night view' }
};
/**
 * Half the size of what "the whole city" is, in metres: the perimeter wall and the three gates
 * (PERIMETER_WALL_TILES out) plus the wall's own thickness and a little air.
 */
const CITY_HALF_M = PERIMETER_WALL_TILES * TILE_METRES + 3.5;
/** The builder camera's offset from its target: SceneManager.panBy puts it exactly here. */
const BUILDER_OFFSET = new THREE.Vector3(70, 80, 70);
/** How much a ground distance along the view shrinks on screen (sine of the camera's pitch). */
const BUILDER_SIN = BUILDER_OFFSET.y / BUILDER_OFFSET.length();
/** Room on screen for the tallest buildings and the gate arches above the city's top edge. */
const BUILDER_EXTRA_M = 14;
/** The thumbnails of "All 12" are 16:10 (the 1280x800 the page is checked at). */
const THUMB = { w: 480, h: 300 };

// ------------------------------------------------------------------ page state (the URL)

const state = readUrl();

function readUrl() {
  const q = new URLSearchParams(location.search);
  const th = Math.round(Number(q.get('th')));
  const levels = q.get('levels');
  return {
    th: th >= 1 && th <= MAX_TOWN_HALL_LEVEL ? th : 1,
    fill: FILLS.includes(q.get('fill')) ? q.get('fill') : 'full',
    levels: levels === '1' || levels === 'one' ? 'one' : 'max',
    view: VIEWS.includes(q.get('view')) ? q.get('view') : 'city'
  };
}

/** Mirror the state into the address bar (replaceState: a Town Hall change is not a new page). */
function writeUrl() {
  const q = new URLSearchParams(location.search);
  q.set('th', String(state.th));
  q.set('fill', state.fill);
  q.set('levels', state.levels === 'one' ? '1' : 'max');
  q.set('view', state.view);
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

// ------------------------------------------------------------------ the game's renderer

const sm = new SceneManager(document.getElementById('canvas-container'));
const assets = new AssetFactory();
const roads = new RoadNetwork(sm.scene, assets);
roads.roadGroup.name = 'preview_road_network';
// null economy + no hooks: see the file comment. (onBuildersChanged / onCityChanged /
// roads.onChange stay null, so no change here can schedule anything.)
const bm = new BuildingManager(sm.scene, assets, roads, null);
bm.buildingGroup.name = 'preview_city_buildings';
bm.isForeignCity = true;

/**
 * The game caps the builder zoom at 100: on its home screen you never need the whole city at
 * once. The preview does (and a 390 px phone or a window with both panels open needs far more
 * than 100 to show it), so THIS instance lets the zoom run out to the framed view. Same body as
 * SceneManager.setZoom otherwise, so the game's own wheel / pinch / Ctrl+- controls drive it.
 */
let zoomCeiling = 100;
sm.setZoom = function setZoom(z) {
  this.builderZoom = Math.max(15, Math.min(zoomCeiling, z));
  const aspect = window.innerWidth / window.innerHeight;
  const cam = this.builderCamera;
  cam.left = -this.builderZoom * aspect;
  cam.right = this.builderZoom * aspect;
  cam.top = this.builderZoom;
  cam.bottom = -this.builderZoom;
  cam.updateProjectionMatrix();
};

// panBy parks the builder camera only ~127 m from its target, and at zoom 100 the near edge of the
// view is just in front of it. Zoomed out further, the ground nearest the viewer falls behind the
// near plane and the sky shows through a hole in the grass. An orthographic camera may have a
// negative near plane (the picture is the same; only the clipping moves), so this one does.
sm.builderCamera.near = -600;
sm.builderCamera.updateProjectionMatrix();

let current = null;            // { gen, restore } of the city on screen

/**
 * Generate the Town Hall `th` city and load it into the preview manager. restoreCity clears the
 * previous city first (BuildingManager.clearAll frees its meshes), so switching never piles up.
 */
function buildCity(th) {
  const gen = generateCity(th, { fill: state.fill, levels: state.levels });
  // `now` = the layout's own clock: no production is credited (nothing here ever pays it out).
  const restore = restoreCity(bm, gen.blob, gen.blob.savedAt);
  bm.setCollectiblesVisible(false);
  if (gen.audit.errors.length || restore.skipped.length || restore.repaired.length) {
    console.error('[preview] Town Hall ' + th + ' city is not clean', { audit: gen.audit, restore });
  }
  return { gen, restore };
}

// ------------------------------------------------------------------ cameras

const $ = (id) => document.getElementById(id);
const ui = $('thp-ui');
const el = {
  left: ui.querySelector('.thp-left'),
  head: ui.querySelector('.thp-head'),
  body: ui.querySelector('.thp-body'),
  right: $('thp-right')
};
const phoneQuery = window.matchMedia('(max-width: 820px)');

/** The part of the window no panel covers, in CSS px: the city is framed into it. */
function freeRect() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const gap = 12;
  const r = { x0: gap, y0: gap, x1: W - gap, y1: H - gap };
  if (phoneQuery.matches) {
    r.y0 = el.head.getBoundingClientRect().bottom + gap;
    r.y1 = el.body.getBoundingClientRect().top - gap;
  } else {
    r.x0 = el.left.getBoundingClientRect().right + gap;
    if (!ui.classList.contains('list-closed')) r.x1 = el.right.getBoundingClientRect().left - gap;
  }
  if (r.x1 - r.x0 < 120 || r.y1 - r.y0 < 120) return { x0: 0, y0: 0, x1: W, y1: H };
  return r;
}

/** The biggest 16:10 box centred in the window: what an "All 12" thumbnail captures. */
function thumbRect() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const w = Math.min(W, H * THUMB.w / THUMB.h);
  const h = w * THUMB.h / THUMB.w;
  return { x0: (W - w) / 2, y0: (H - h) / 2, x1: (W + w) / 2, y1: (H + h) / 2 };
}

/**
 * Frame the whole city in `rect` with the builder (isometric) camera. An orthographic view shows
 * the round city as an ellipse: its full width across, its depth shortened by the camera's pitch.
 * The target is then slid along the ground so the city's centre lands in the middle of `rect`.
 */
function frameBuilder(rect) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const fw = rect.x1 - rect.x0;
  const fh = rect.y1 - rect.y0;
  const across = 2 * CITY_HALF_M;
  const deep = 2 * CITY_HALF_M * BUILDER_SIN + BUILDER_EXTRA_M;
  const zoom = Math.max(across * H / (2 * fw), deep * H / (2 * fh)) * 1.03;
  zoomCeiling = Math.max(100, zoom * 1.25);
  sm.setZoom(zoom);

  const wpp = 2 * sm.builderZoom / H;                      // world units per CSS px (both axes)
  const ox = (rect.x0 + rect.x1) / 2 - W / 2;
  // The ground ellipse sits half the headroom below the middle: the headroom is above it.
  const oy = (rect.y0 + rect.y1) / 2 - H / 2 + (BUILDER_EXTRA_M / 2) / wpp;
  // Screen-right on the ground is (1,0,-1)/√2; "away from the camera" is (-1,0,-1)/√2 and a step
  // that way moves the city down the screen by BUILDER_SIN of it.
  const right = -ox * wpp;
  const away = oy * wpp / BUILDER_SIN;
  const s = Math.SQRT1_2;
  sm.builderTarget.set(right * s - away * s, 0, -right * s - away * s);
  sm.builderCamera.position.copy(sm.builderTarget).add(BUILDER_OFFSET);
  sm.builderCamera.lookAt(sm.builderTarget);
}

/**
 * Frame the whole city in `rect` with the recon (satellite) camera. The game's own
 * frameReconOnTargets sets the view direction (mostly overhead, a slight tilt); the distance and
 * aim are then set for the free rect instead of the raid's banner offset.
 */
function frameRecon(rect) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cam = sm.reconCamera;
  const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
  const tanFit = tanV * Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0) / H;
  const dist = (CITY_HALF_M * 1.06) / tanFit;
  sm.frameReconOnTargets(bm.getMainGates().map(g => g.mesh && g.mesh.position).filter(Boolean));
  const wpp = 2 * dist * tanV / H;
  const ox = (rect.x0 + rect.x1) / 2 - W / 2;
  const oy = (rect.y0 + rect.y1) / 2 - H / 2;
  sm.reconTarget.set(-ox * wpp, 0, -oy * wpp);
  sm.reconDist = dist;
  cam.position.copy(sm.reconTarget).addScaledVector(sm.reconDir, dist);
  cam.lookAt(sm.reconTarget);
}

/** Put the chosen view on screen, framed on `rect`: builder daylight, recon day or recon night. */
function applyView(rect = freeRect()) {
  if (state.view === 'city') {
    sm.setCameraMode('builder');
    frameBuilder(rect);
  } else {
    // Theme first: setCameraMode('recon') applies whatever theme is stored (a battle's order).
    sm.setRaidTheme(state.view === 'night' ? 'night' : 'day');
    sm.setCameraMode('recon');
    frameRecon(rect);
  }
}

function cameraSnapshot() {
  return {
    builderTarget: sm.builderTarget.clone(),
    builderZoom: sm.builderZoom,
    reconTarget: sm.reconTarget ? sm.reconTarget.clone() : null,
    reconDist: sm.reconDist
  };
}

function restoreCamera(s) {
  sm.builderTarget.copy(s.builderTarget);
  sm.setZoom(s.builderZoom);
  sm.builderCamera.position.copy(sm.builderTarget).add(BUILDER_OFFSET);
  sm.builderCamera.lookAt(sm.builderTarget);
  if (s.reconTarget && sm.reconDir) {
    sm.reconTarget.copy(s.reconTarget);
    sm.reconDist = s.reconDist;
    sm.reconCamera.position.copy(sm.reconTarget).addScaledVector(sm.reconDir, s.reconDist);
    sm.reconCamera.lookAt(sm.reconTarget);
  }
}

// ------------------------------------------------------------------ the frame loop

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();
  // Mesh animation only (spinning blades, beacons, radar dishes), as ArenaCity.update does: the
  // manager's full update() would run production and collect bubbles, which a preview has no use for.
  for (const b of bm.buildings) {
    const a = b.mesh && b.mesh.userData && b.mesh.userData.animator;
    if (a) a(delta, elapsed);
  }
  sm.update(delta);
  sm.render();
}

// ------------------------------------------------------------------ panels

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nameOf = (t) => (BUILDING_DEFS[t] ? BUILDING_DEFS[t].name : t);
const iconOf = (t) => (BUILDING_DEFS[t] ? BUILDING_DEFS[t].icon : '');

function renderSelector() {
  const grid = $('thp-th-grid');
  if (!grid.children.length) {
    for (let th = 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thp-th-btn';
      b.textContent = String(th);
      b.dataset.th = String(th);
      b.setAttribute('role', 'radio');
      b.title = `Town Hall ${th} - ${unlocksAt(th).name}`;
      b.addEventListener('click', () => show(th));
      grid.appendChild(b);
    }
  }
  for (const b of grid.children) {
    const on = Number(b.dataset.th) === state.th;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  }
}

function renderInfo() {
  const u = unlocksAt(state.th);
  $('thp-th-badge').textContent = String(state.th);
  $('thp-th-name').textContent = u.name;
  $('thp-th-theme').textContent = u.theme;
  const stats = [
    ['Radius', `${u.cityRadius} <small>tiles</small>`, 'Buildable radius: every structure stands within this many tiles of the centre'],
    ['Builders', `${u.builders}`, 'Labour cap: Labour Huts this Town Hall can staff (parallel upgrades)'],
    ['Police cap', `${u.policeCap}`, 'City-wide cap on pursuit units (cruisers, SWAT, drones)'],
    ['Level cap', `${u.levelCap}`, 'No building can be upgraded past the Town Hall\'s level'],
    ['Road budget', `${limitFor('road', state.th)}`, 'Road tiles this Town Hall allows'],
    ['Counted', `${countedLimitFor(state.th)}`, 'Counted structures allowed (everything a raid must raze: not gates, trees or drive-over traps)']
  ];
  $('thp-stats').innerHTML = stats.map(([k, v, tip]) =>
    `<div class="thp-stat" title="${esc(tip)}"><div class="thp-stat-k">${k}</div><div class="thp-stat-v">${v}</div></div>`).join('');
  $('thp-new').innerHTML = u.newBuildings.map(t =>
    `<span class="thp-chip" title="${esc(BUILDING_DEFS[t].desc || '')}">${iconOf(t)} ${esc(nameOf(t))}</span>`).join('');
  $('thp-raised').innerHTML = u.raisedLimits.length
    ? '<b>Raised limits:</b> ' + u.raisedLimits.map(r =>
      `<span title="${esc(nameOf(r.type))}">${iconOf(r.type)}&nbsp;${r.from}→${r.to}</span>`).join(' · ')
    : '';
}

function renderOptions() {
  for (const seg of ui.querySelectorAll('.thp-seg')) {
    const opt = seg.dataset.opt;
    for (const b of seg.querySelectorAll('button')) b.classList.toggle('active', b.dataset.val === state[opt]);
  }
}

const LIST_GROUPS = [
  ['Town Hall & core', ['hall', 'core']],
  ['Gate defense', ['gates']],
  ['Economy & storage', ['economy']],
  ['Barriers', ['barrier']],
  ['Drive-over traps', ['trap']],
  ['Scenery & roads', ['tree']]
];

function listHtml() {
  if (!current) return '';
  const rep = current.gen.report;
  const t = rep.totals;
  const total = (k, placed, of) => `<div class="thp-total"><div class="thp-total-k">${k}</div>` +
    `<div class="thp-total-v">${placed} <small>/ ${of}</small></div></div>`;
  const ok = !rep.skipped.length;
  let html = `<div class="thp-list-title">IN THIS CITY</div>` +
    `<div class="thp-list-sub">Town Hall ${rep.th} · ${esc(rep.name)}</div>` +
    `<div class="thp-totals">` +
    total('Counted structures', t.counted.placed, t.counted.limit) +
    total('Traps', t.traps.placed, t.traps.limit) +
    total('Trees', t.trees.placed, t.trees.limit) +
    total('Road tiles', t.roads.placed, t.roads.limit) +
    `</div>` +
    `<div class="thp-summary${ok ? '' : ' warn'}">${ok ? '✓' : '⚠'} ${esc(rep.summary)}.` +
    (ok ? '' : `<br><small>No legal tile left for: ${rep.skipped.map(s => `${s.n} × ${esc(s.name)}`).join(', ')}</small>`) +
    `</div>`;
  for (const [title, zones] of LIST_GROUPS) {
    const rows = rep.rows.filter(r => zones.includes(r.zone));
    if (!rows.length) continue;
    html += `<div class="thp-group"><div class="thp-group-title">${title}</div>`;
    for (const r of rows) {
      const short = r.placed < r.wanted;
      const lvl = r.level === null ? '' : r.fixed ? 'fixed' : `Lv ${r.level}`;
      html += `<div class="thp-row${r.isNew ? ' is-new' : ''}" data-type="${r.type}">` +
        `<span class="thp-row-icon">${r.icon}</span>` +
        `<span class="thp-row-name" title="${esc(r.name)}">${esc(r.name)}${r.isNew ? '<span class="thp-badge-new">NEW</span>' : ''}</span>` +
        `<span class="thp-row-count${short ? ' short' : ''}"${short ? ` title="${r.wanted - r.placed} did not fit"` : ''}>${r.placed}<small>/${r.limit}</small></span>` +
        `<span class="thp-row-lvl">${lvl}</span></div>`;
    }
    html += '</div>';
  }
  html += `<details class="thp-map"><summary>Text map (cityRules.renderAsciiMap)</summary><pre>${esc(current.gen.map)}</pre></details>`;
  return html;
}

/** The list lives in the right column on a wide screen and in the "Contents" tab on a phone. */
function renderList() {
  const html = listHtml();
  const phone = phoneQuery.matches;
  $('thp-list-desktop').innerHTML = phone ? '' : html;
  $('thp-list-mobile').innerHTML = phone ? html : '';
}

function renderPanels() {
  renderSelector();
  renderInfo();
  renderOptions();
  renderList();
}

let toastTimer = 0;
function toast(text, ms = 1400) {
  const t = $('thp-toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ------------------------------------------------------------------ actions

/** Show Town Hall `th` (keeps the camera where it is, so two levels compare spot for spot). */
function show(th, { reframe = false } = {}) {
  const T = Math.max(1, Math.min(MAX_TOWN_HALL_LEVEL, th));
  cancelAll12();
  state.th = T;
  current = buildCity(T);
  renderPanels();
  writeUrl();
  if (reframe) applyView();
  toast(`Town Hall ${T} · ${current.gen.report.name}`);
}

function setOption(opt, val) {
  if (state[opt] === val) return;
  state[opt] = val;
  if (opt === 'view') {
    renderOptions();
    writeUrl();
    applyView();
    return;
  }
  show(state.th);
}

// ------------------------------------------------------------------ All 12

const overlay = $('thp-overlay');
const thumbs = new Map();       // options key -> [12 canvases], once a run has finished
let runToken = 0;
let running = null;             // { token, keepTh, camera } while a run is going

const optionsKey = () => `${state.fill}|${state.levels}|${state.view}|${window.innerWidth}x${window.innerHeight}`;
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

function cardFor(th, canvas, report) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'thp-card' + (th === state.th ? ' current' : '');
  card.dataset.th = String(th);
  const u = unlocksAt(th);
  card.title = `Town Hall ${th} · ${u.name}`;     // the caption is cut to one line
  const meta = report
    ? `${report.totals.counted.placed} counted · ${report.totals.traps.placed} traps · ${u.newBuildings.length} new`
    : 'rendering...';
  card.innerHTML = `<div class="thp-card-img">${canvas ? '' : '<div class="thp-card-wait">rendering...</div>'}</div>` +
    `<div class="thp-card-cap"><div class="thp-card-title"><b>TH ${th}</b> · ${esc(u.name)}</div>` +
    `<div class="thp-card-meta">${meta}</div></div>`;
  if (canvas) card.querySelector('.thp-card-img').appendChild(canvas);
  card.addEventListener('click', () => {
    closeAll12();
    show(th);
  });
  return card;
}

/**
 * Render every Town Hall in turn with the current options and view, capturing each frame into a
 * thumbnail, then put the Town Hall that was on screen back (and its camera). The capture is a
 * drawImage straight after the render, in the same task, so the WebGL buffer is still intact.
 */
async function openAll12() {
  overlay.classList.remove('hidden');
  $('thp-overlay-sub').textContent = `${LABELS.fill[state.fill]} · ${LABELS.levels[state.levels]} · ` +
    `${LABELS.view[state.view]} - click a Town Hall to open it`;
  const grid = $('thp-grid');
  grid.innerHTML = '';
  const key = optionsKey();
  const done = thumbs.get(key);
  if (done) {
    done.forEach((d, i) => grid.appendChild(cardFor(i + 1, d.canvas, d.report)));
    $('thp-progress').classList.add('done');
    return;
  }
  if (running) return;
  const cards = [];
  for (let th = 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
    const c = cardFor(th, null, null);
    cards.push(c);
    grid.appendChild(c);
  }
  const bar = $('thp-progress');
  bar.classList.remove('done');
  $('thp-progress-fill').style.width = '0%';
  const token = ++runToken;
  running = { token, keepTh: state.th, camera: cameraSnapshot() };
  const results = [];
  const dpr = sm.renderer.getPixelRatio();
  const rect = thumbRect();
  for (let th = 1; th <= MAX_TOWN_HALL_LEVEL; th++) {
    await nextFrame();                                   // let the progress bar paint
    if (token !== runToken) return;
    const built = buildCity(th);
    applyView(rect);
    sm.render();
    const canvas = document.createElement('canvas');
    canvas.width = THUMB.w;
    canvas.height = THUMB.h;
    canvas.getContext('2d').drawImage(sm.renderer.domElement,
      rect.x0 * dpr, rect.y0 * dpr, (rect.x1 - rect.x0) * dpr, (rect.y1 - rect.y0) * dpr, 0, 0, THUMB.w, THUMB.h);
    results.push({ canvas, report: built.gen.report });
    const fresh = cardFor(th, canvas, built.gen.report);
    cards[th - 1].replaceWith(fresh);
    cards[th - 1] = fresh;
    $('thp-progress-fill').style.width = `${Math.round(100 * th / MAX_TOWN_HALL_LEVEL)}%`;
  }
  thumbs.set(key, results);
  bar.classList.add('done');
  finishRun();
}

/** Put back the Town Hall and camera that were on screen before the run. */
function finishRun() {
  if (!running) return;
  const { keepTh, camera } = running;
  running = null;
  current = buildCity(keepTh);
  state.th = keepTh;
  applyView();
  restoreCamera(camera);
  renderPanels();
}

function cancelAll12() {
  if (!running) return;
  runToken++;
  finishRun();
}

function closeAll12() {
  cancelAll12();
  overlay.classList.add('hidden');
}

// ------------------------------------------------------------------ input

// The panels are not the map: keep their presses, wheels and touches away from the game's
// window-level camera controls (a wheel over the list scrolls it instead of zooming the city,
// and a press on a button never starts a recon drag).
for (const panel of [el.head, el.body, el.right, $('thp-reopen'), overlay]) {
  for (const type of ['pointerdown', 'wheel', 'touchstart', 'touchmove']) {
    panel.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
  }
}

for (const seg of ui.querySelectorAll('.thp-seg')) {
  for (const b of seg.querySelectorAll('button')) {
    b.addEventListener('click', () => setOption(seg.dataset.opt, b.dataset.val));
  }
}
for (const b of ui.querySelectorAll('.thp-tabs button')) {
  b.addEventListener('click', () => { ui.dataset.tab = b.dataset.tab; });
}
$('thp-reset').addEventListener('click', () => applyView());
$('thp-all').addEventListener('click', () => openAll12());
$('thp-overlay-close').addEventListener('click', () => closeAll12());
$('thp-collapse').addEventListener('click', () => { ui.classList.add('list-closed'); applyView(); });
$('thp-reopen').addEventListener('click', () => { ui.classList.remove('list-closed'); applyView(); });

// ← / → step the Town Hall. Caught on the document so the game's own arrow-key panning (a
// window listener in SceneManager) never sees them; ↑ / ↓ still pan the builder camera.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.classList.contains('hidden')) { closeAll12(); return; }
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.ctrlKey || e.metaKey || e.altKey || !overlay.classList.contains('hidden')) return;
  e.stopPropagation();
  e.preventDefault();
  const next = state.th + (e.key === 'ArrowRight' ? 1 : -1);
  if (next >= 1 && next <= MAX_TOWN_HALL_LEVEL) show(next);
});

// Drag the map to pan the builder camera with the game's own panBy, as the home screen does
// (GridSystem). The recon view has its own drag in SceneManager. One finger / button only: two
// fingers are the game's pinch zoom.
const pointers = new Set();
let drag = null;
sm.renderer.domElement.addEventListener('pointerdown', (e) => {
  pointers.add(e.pointerId);
  drag = pointers.size === 1 && e.button === 0 && sm.activeCamera === sm.builderCamera
    ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
});
window.addEventListener('pointermove', (e) => {
  if (!drag || drag.id !== e.pointerId || pointers.size !== 1) return;
  sm.panBy(e.clientX - drag.x, e.clientY - drag.y);
  drag.x = e.clientX;
  drag.y = e.clientY;
});
const endPointer = (e) => {
  pointers.delete(e.pointerId);
  if (drag && drag.id === e.pointerId) drag = null;
};
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

// SceneManager's own resize handler runs first (and resets the builder frustum to a fixed size),
// so re-frame after it; a phone <-> wide switch also moves the list between its two homes.
window.addEventListener('resize', () => {
  renderList();
  if (!running) applyView();
});
phoneQuery.addEventListener('change', () => renderList());

// ------------------------------------------------------------------ boot

current = buildCity(state.th);
renderPanels();
writeUrl();
applyView();
requestAnimationFrame(frame);

/** Handle for tooling and the page's own checks (like window.citySiege in the game). */
window.thPreview = {
  sm,
  bm,
  state,
  get current() { return current; },
  show,
  setOption,
  applyView,
  openAll12,
  closeAll12,
  get running() { return !!running; },
  memory: () => ({ ...sm.renderer.info.memory })
};
