// The Grey Lantern — game loop and state. Loads each hall, runs the
// thief and the guards, spreads noise, hands out relics and decides when
// the thief is caught, a hall is cleared, or the whole burglary is won.
//
// Phases: title → play → (paused) → levelclear → play … → win.
// Being caught restarts the current hall; the relic count of that hall
// resets with it, so a clean run is always one hall away.
import { CAUGHT_PAUSE_SECONDS, TILE, VIEW_H, VIEW_W } from './config.js';
import { findStart, LEVELS } from './levels.js';
import { Guard } from './guard.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { Hud } from './hud.js';
import { Sound } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = new Input(canvas);
const renderer = new Renderer(canvas);
const hud = new Hud();
const sound = new Sound();

const game = {
  phase: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  relics: [],
  exit: null,
  elapsed: 0,
  totalTime: 0,
  spotted: 0, // times caught on this hall
  totalSpotted: 0,
  noiseRings: [],
  toast: null,
  caughtTimer: 0,
  shotMode: false,
  aim: null,
  renderer,
  lastStepPhase: 0,
};

function loadLevel(index) {
  const def = LEVELS[index];
  game.levelIndex = index;
  game.level = def;
  game.elapsed = 0;
  game.spotted = 0;
  game.noiseRings = [];
  game.toast = null;
  const start = findStart(def.grid);
  game.player = new Player(start);
  game.guards = def.guards.map((g) => new Guard(g.patrol, g.facing));
  game.relics = [];
  for (let y = 0; y < def.grid.length; y += 1) {
    for (let x = 0; x < def.grid[y].length; x += 1) {
      if (def.grid[y][x] === 'R') game.relics.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      if (def.grid[y][x] === 'E') game.exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
    }
  }
  game.toast = { text: def.brief, born: performance.now() };
}

function showToast(text) {
  game.toast = { text, born: performance.now() };
}

function onCaught() {
  if (game.phase !== 'play') return;
  game.phase = 'caught';
  game.caughtTimer = CAUGHT_PAUSE_SECONDS;
  game.spotted += 1;
  game.totalSpotted += 1;
  sound.alarm();
}

function spreadNoise(noise) {
  if (!noise) return;
  game.noiseRings.push({ x: noise.x, y: noise.y, radius: noise.radius, born: performance.now() });
  for (const guard of game.guards) {
    if (Math.hypot(guard.x - noise.x, guard.y - noise.y) <= noise.radius) {
      const wasCalm = guard.state === 'patrol' && guard.meter < 34;
      guard.hear(noise.x, noise.y);
      if (wasCalm) sound.suspicious();
    }
  }
}

// Footsteps: the player's own steps are soft taps; a guard's steps pan by
// where the guard stands relative to the thief, so sound locates patrols.
function playFootsteps(dt) {
  const p = game.player;
  if (p.moving && Math.floor(p.stepPhase / Math.PI) !== Math.floor(game.lastStepPhase / Math.PI)) {
    sound.footstep(0, p.running ? 1 : p.crouched ? 0.25 : 0.5);
  }
  game.lastStepPhase = p.stepPhase;
  for (const guard of game.guards) {
    if (!guard.moving) continue;
    const prev = guard.stepMark ?? 0;
    if (Math.floor(guard.stepPhase / Math.PI) !== Math.floor(prev / Math.PI)) {
      const dx = guard.x - p.x;
      const dy = guard.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 420) {
        const pan = Math.max(-1, Math.min(1, dx / 300));
        sound.footstep(pan, Math.max(0.15, 1 - dist / 420));
      }
    }
    guard.stepMark = guard.stepPhase;
  }
}

function updatePlay(dt) {
  const p = game.player;
  const noise = p.update(game.level.grid, input, dt);
  if (noise) spreadNoise(noise);

  // Throw a pebble where the mouse points (click or Space).
  const throwAt = input.clicked ?? (input.wasPressed('Space') ? { x: input.mouse.x, y: input.mouse.y } : null);
  if (throwAt && input.mouse.inside !== false) {
    const pebble = p.throwPebble(throwAt.x, throwAt.y);
    if (pebble) {
      sound.pebble();
      spreadNoise(pebble);
    } else if (input.clicked) {
      showToast('Out of pebbles — move quietly instead');
    }
  }
  game.aim = input.mouse.inside ? { x: input.mouse.x, y: input.mouse.y } : null;

  for (const guard of game.guards) {
    const wasAlert = guard.state === 'alert';
    guard.update(game.level.grid, p, dt, onCaught);
    if (!wasAlert && guard.state === 'alert') sound.alarm();
    if (game.phase !== 'play') break;
  }
  if (game.phase !== 'play') return;

  playFootsteps(dt);

  // Pick up relics by walking over them.
  for (const relic of game.relics) {
    if (!relic.taken && Math.hypot(relic.x - p.x, relic.y - p.y) < 26) {
      relic.taken = true;
      p.relics += 1;
      sound.pickup();
      const left = game.relics.filter((r) => !r.taken).length;
      showToast(left === 0 ? 'All relics taken — the exit gate is open!' : `Relic taken — ${left} more to steal`);
    }
  }

  // Reach the exit with every relic to clear the hall.
  if (
    game.relics.every((r) => r.taken) &&
    Math.hypot(game.exit.x - p.x, game.exit.y - p.y) < 30
  ) {
    game.totalTime += game.elapsed;
    if (game.levelIndex + 1 >= LEVELS.length) {
      game.phase = 'win';
      sound.win();
    } else {
      game.phase = 'levelclear';
      sound.win();
    }
  }

  game.elapsed += dt;
  game.noiseRings = game.noiseRings.filter((r) => performance.now() - r.born < 900);
}

function handleKeys() {
  if (input.wasPressed('KeyM')) sound.toggleMute();
  if (game.phase === 'title') {
    if (input.wasPressed('Enter') || input.clicked) {
      sound.unlock();
      game.phase = 'play';
    }
    return;
  }
  if (game.phase === 'play') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) game.phase = 'paused';
    if (input.wasPressed('KeyR')) loadLevel(game.levelIndex);
    return;
  }
  if (game.phase === 'paused') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) game.phase = 'play';
    if (input.wasPressed('KeyR')) {
      loadLevel(game.levelIndex);
      game.phase = 'play';
    }
    return;
  }
  if (game.phase === 'levelclear') {
    if (input.wasPressed('Enter') || input.clicked) {
      loadLevel(game.levelIndex + 1);
      game.phase = 'play';
    }
    return;
  }
  if (game.phase === 'win') {
    if (input.wasPressed('Enter') || input.clicked) {
      game.totalTime = 0;
      game.totalSpotted = 0;
      loadLevel(0);
      game.phase = 'play';
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  sound.unlock();

  if (game.phase === 'caught') {
    game.caughtTimer -= dt;
    if (game.caughtTimer <= 0) {
      loadLevel(game.levelIndex);
      game.phase = 'play';
    }
  } else if (game.phase === 'play' && !game.shotMode) {
    updatePlay(dt);
  }
  handleKeys();

  renderer.draw(game);
  hud.draw(game);
  input.endFrame();
  requestAnimationFrame(frame);
}

loadLevel(0);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(game, shot);
} else {
  window.__shotReady = true;
}
requestAnimationFrame(frame);

// Expose the game for play-testing from the console.
window.__game = game;
export { game };
