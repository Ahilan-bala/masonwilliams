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
  mode: 'move', player: { x: 10, y: LOS_Y + 0.5 }, route: []
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function toFieldCoords(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: clamp(p.x, 0, FIELD_W), y: clamp(p.y, 0, FIELD_H) };
}

const playerEl = document.getElementById('player');
const labelEl = document.getElementById('player-label');
const routeEl = document.getElementById('route');
const waypointsEl = document.getElementById('waypoints');

function render() {
  playerEl.setAttribute('cx', state.player.x);
  playerEl.setAttribute('cy', state.player.y);
  labelEl.setAttribute('x', state.player.x);
  labelEl.setAttribute('y', state.player.y + 0.32);


  const pts = [state.player, ...state.route];
  routeEl.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));

  routeEl.style.display = state.route.length ? '' : 'none';

  waypointsEl.innerHTML = '';
  state.route.forEach((p, i) => {
    const c = el('circle', {
      cx: p.x, cy: p.y, r: 0.45, class: 'waypoint',
      fill: '#ffd400', stroke: '#12161c', 'stroke-width': 0.12
    }, waypointsEl);
    c.addEventListener('pointerdown', e => startWaypointDrag(e, i));
  });

  updateUI();

}

let drag = null;

playerEl.addEventListener('pointerdown', e => {
  if (state.mode !== 'move') return;
  e.preventDefault();
  const p = toFieldCoords(e);
  drag = { type: 'player', last: p };
});

function startWaypointDrag(e, index) {
  if (state.mode !== 'move') return;
  e.preventDefault();
  e.stopPropagation();
  drag = { type: 'waypoint', index };
}


window.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = toFieldCoords(e);

  if (drag.type === 'player') {

    const dx = p.x - drag.last.x;
    const dy = p.y - drag.last.y;
    state.player.x = clamp(state.player.x + dx, 0, FIELD_W);
    state.player.y = clamp(state.player.y + dy, 0, FIELD_H);
    state.route.forEach(w => {
      w.x = clamp(w.x + dx, 0, FIELD_W);
      w.y = clamp(w.y + dy, 0, FIELD_H);
    });
    drag.last = p;
  } else if (drag.type === 'waypoint') {
    state.route[drag.index] = p;
  }
  render();
});

window.addEventListener('pointerup', () => { drag = null; });
window.addEventListener('pointercancel', () => { drag = null; });

svg.addEventListener('pointerdown', e => {
  if (state.mode !== 'draw') return;
  e.preventDefault();
  state.route.push(toFieldCoords(e));
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
  state.route.pop();
  render();
});
document.getElementById('btn-clear').addEventListener('click', () => {
  state.route = [];
  render();
});


function updateUI() {
  btnMove.classList.toggle('active', state.mode === 'move');
  btnDraw.classList.toggle('active', state.mode === 'draw');
  svg.classList.toggle('draw-mode', state.mode === 'draw');
  hint.textContent = state.mode === 'move'
    ? 'Drag the player to move them (the route follows). Drag yellow dots to reshape the route.'
    : 'Click anywhere on the field to add route points. Switch to Move when you are done.';
}

drawField();
render();