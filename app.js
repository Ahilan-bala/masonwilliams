const FIELD_W = 53.3;
const FIELD_H = 30;
const HASH_LEFT = 23.50;
const HASH_RIGHT = FIELD_W - HASH_LEFT;
const LOS_Y = 20;

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('field');

function el(name, attrs, parent) {
  const node = document.createElementNS(SVG_NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

function drawField() {
  const turf = document.getElementById('turf');
  const lines = document.getElementById('lines');

  for (let y = 0; y < FIELD_H; y += 5) {
    el('rect', {
      x: 0, y, width: FIELD_W, height: 5, fill: (y / 5) % 2 === 0 ? '#2e8b3d' : '#35974a'
    }, turf);
  }

  for (let y = 0; y <= FIELD_H; y += 5) {
    el('line', {
      x1: 0, y1: y, x2: FIELD_W, y2: y,
      stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 0.18
    }, lines);
  }

  for (let y = 1; y < FIELD_H; y++) {
    if (y % 5 === 0) continue;
    for (const x of [HASH_LEFT, HASH_RIGHT]) {
      el('line', {
        x1: x - 0.4, y1: y, x2: x + 0.4, y2: y,
        stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 0.14
      }, lines);
    }
    for (const [x1, x2] of [[0, 0.8], [FIELD_W - 0.8, FIELD_W]]) {
      el('line', {
        x1, y1: y, x2, y2: y,
        stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 0.14
      }, lines);
    }
  }

  for (const x of [0.09, FIELD_W - 0.09]) {
    el('line', {
      x1: x, y1: 0, x2: x, y2: FIELD_H,
      stroke: '#fff', 'stroke-width': 0.18
    }, lines);
  }

  el('line', {
    x1: 0, y1: LOS_Y, x2: FIELD_W, y2: LOS_Y,
    stroke: '#4aa3ff', 'stroke-width': 0.28
  }, lines);
}


const state = {
  mode: 'move',
  selectedId: 'WR',
  players: [
    // offense
    { id: 'QB', team: 'off', x: 26.65, y: LOS_Y + 5, route: [] },
    { id: 'RB', team: 'off', x: 30, y: LOS_Y + 5, route: [] },
    { id: 'WR', team: 'off', x: 8, y: LOS_Y + 0.5, route: [] },
    { id: 'TE', team: 'off', x: 33, y: LOS_Y + 0.5, route: [] },
    // defense
    { id: 'CB', team: 'def', x: 8, y: LOS_Y - 2, route: [] },
    { id: 'S', team: 'def', x: 26.65, y: LOS_Y - 8, route: [] },
    { id: 'LB', team: 'def', x: 30, y: LOS_Y - 4, route: [] }
  ]
};

const TEAM_COLOR = { off: '#e63946', def: '#2d6cdf' };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const getPlayer = id => state.players.find(p => p.id === id);
const selected = () => getPlayer(state.selectedId);

function toFieldCoords(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: clamp(p.x, 0, FIELD_W), y: clamp(p.y, 0, FIELD_H) };
}

const routesEl = document.getElementById('routes');
const waypointsEl = document.getElementById('waypoints');
const playersEl = document.getElementById('players');

function render() {
  routesEl.innerHTML = '';
  waypointsEl.innerHTML = '';
  playersEl.innerHTML = '';

  state.players.forEach(pl => {
    if (pl.route.length) {
      const pts = [pl, ...pl.route].map(p => `${p.x},${p.y}`).join(' ');
      el('polyline', {
        points: pts, fill: 'none', stroke: '#ffd400', 'stroke-width': 0.35,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'marker-end': 'url(#arrow)'
      }, routesEl);
    }

    if (pl.id === state.selectedId) {
      pl.route.forEach((p, i) => {
        const c = el('circle', {
          cx: p.x, cy: p.y, r: 0.45, class: 'waypoint',
          fill: '#ffd400', stroke: '#12161c', 'stroke-width': 0.12
        }, waypointsEl);
        c.addEventListener('pointerdown', e => startWaypointDrag(e, pl.id, i));
      });
    }

    const isSel = pl.id === state.selectedId;
    const c = el('circle', {
      cx: pl.x, cy: pl.y, r: 1, class: 'player',
      fill: TEAM_COLOR[pl.team],
      stroke: isSel ? '#ffd400' : '#fff',
      'stroke-width': isSel ? 0.4 : 0.25
    }, playersEl);
    c.addEventListener('pointerdown', e => onPlayerDown(e, pl.id));

    const t = el('text', {
      x: pl.x, y: pl.y + 0.32, 'text-anchor': 'middle', 'font-size': 0.8,
      fill: '#fff', 'font-weight': 'bold', 'pointer-events': 'none'
    }, playersEl);
    t.textContent = pl.id;
  });

  updateUI();
}

let drag = null;

function onPlayerDown(e, id) {
  e.preventDefault();
  e.stopPropagation();
  state.selectedId = id;
  if (state.mode === 'move') {
    drag = { type: 'player', id, last: toFieldCoords(e) };
  }
  render();
}

function startWaypointDrag(e, id, index) {
  if (state.mode !== 'move') return;
  e.preventDefault();
  e.stopPropagation();
  drag = { type: 'waypoint', id, index };
}

window.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = toFieldCoords(e);
  const pl = getPlayer(drag.id);

  if (drag.type === 'player') {
    const dx = p.x - drag.last.x;
    const dy = p.y - drag.last.y;
    pl.x = clamp(pl.x + dx, 0, FIELD_W);
    pl.y = clamp(pl.y + dy, 0, FIELD_H);
    pl.route.forEach(w => {
      w.x = clamp(w.x + dx, 0, FIELD_W);
      w.y = clamp(w.y + dy, 0, FIELD_H);
    });
    drag.last = p;
  } else {
    pl.route[drag.index] = p;
  }
  render();
});

window.addEventListener('pointerup', () => { drag = null; });
window.addEventListener('pointercancel', () => { drag = null; });

svg.addEventListener('pointerdown', e => {
  if (state.mode !== 'draw') return;
  e.preventDefault();
  selected().route.push(toFieldCoords(e));
  render();
});

const btnMove = document.getElementById('btn-move');
const btnDraw = document.getElementById('btn-draw');
const hint = document.getElementById('hint');

function setMode(mode) {
  state.mode = mode;
  render();
}

btnMove.addEventListener('click', () => setMode('move'));
btnDraw.addEventListener('click', () => setMode('draw'));
document.getElementById('btn-undo').addEventListener('click', () => {
  selected().route.pop();
  render();
});
document.getElementById('btn-clear').addEventListener('click', () => {
  selected().route = [];
  render();
});

function updateUI() {
  btnMove.classList.toggle('active', state.mode === 'move');
  btnDraw.classList.toggle('active', state.mode === 'draw');
  svg.classList.toggle('draw-mode', state.mode === 'draw');
  hint.textContent = state.mode === 'move'
    ? `Selected: ${state.selectedId}. Drag a player to move them (their route follows). Click a player to select.`
    : `Drawing route for ${state.selectedId}. Click the field to add points, or click another player to switch.`;
}

const DEFENSE_POSITIONS = ['CB', 'S', 'LB', 'DL'];

function addPlayer(position) {
  const team = DEFENSE_POSITIONS.includes(position) ? 'def' : 'off';

  let id = position;
  let n = 2;
  while (getPlayer(id)) id = position + n++;

  const count = state.players.filter(p => p.team === team).length;
  state.players.push({
    id, team,
    x: 8 + (count % 8) * 5,
    y: team === 'off' ? LOS_Y + 3 : LOS_Y - 3,
    route: []
  });
  state.selectedId = id;
  render();
}

function removeSelected() {
  if (state.players.length <= 1) return;
  state.players = state.players.filter(p => p.id !== state.selectedId);
  state.selectedId = state.players[0].id;
  render();
}

document.getElementById('btn-add').addEventListener('click', () => {
  addPlayer(document.getElementById('pos-select').value);
});
document.getElementById('btn-remove').addEventListener('click', removeSelected);

const STORAGE_KEY = 'routeBuilder.plays';

function loadPlays() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writePlays(plays) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
  } catch {
    alert('Could not save: your browser is blocking local storage.');
  }
}

function savePlay(name) {
  if (!name) return;
  const plays = loadPlays();
  plays[name] = state.players;
  writePlays(plays);
  refreshPlayList(name);
}

function loadPlay(name) {
  let play = loadPlays()[name];
  if (!play) return;
  if (!Array.isArray(play)) {
    play = [{ id: 'WR', team: 'off', x: play.player.x, y: play.player.y, route: play.route }];
  }
  if (!play.length) return;
  state.players = play;
  state.selectedId = play[0].id;
  render();
}

function deletePlay(name) {
  const plays = loadPlays();
  delete plays[name];
  writePlays(plays);
  refreshPlayList();
}

function refreshPlayList(selectName) {
  const list = document.getElementById('play-list');
  list.innerHTML = '';
  Object.keys(loadPlays()).forEach(name => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = name;
    list.appendChild(opt);
  });
  if (selectName) list.value = selectName;
}

const nameInput = document.getElementById('play-name');
const playList = document.getElementById('play-list');

document.getElementById('btn-save').addEventListener('click', () => savePlay(nameInput.value.trim()));
document.getElementById('btn-load').addEventListener('click', () => loadPlay(playList.value));
document.getElementById('btn-delete').addEventListener('click', () => deletePlay(playList.value));

drawField();
render();
refreshPlayList();